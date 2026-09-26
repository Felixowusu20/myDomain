import assert from "node:assert/strict";
import { randomUUID } from "crypto";
import { after, before, describe, it, type TestContext } from "node:test";
import { prisma } from "@/lib/db";
import { getDatabaseUrl } from "@/lib/env";
import { MessagingError } from "@/lib/messaging/errors";
import { processSmsBatch } from "@/lib/messaging/queue";
import { createApiProject, createProjectApiKey } from "@/lib/services/api-project.service";
import { queueSms } from "@/lib/services/messaging.service";
import { sendOtp, verifyOtp } from "@/lib/services/otp.service";
import { POST as sendRoute } from "@/app/api/v1/otp/send/route";
import { POST as verifyRoute } from "@/app/api/v1/otp/verify/route";
import { POST as smsRoute } from "@/app/api/v1/sms/send/route";

let databaseReady = false;
const phone = "+233241110011";

function requireDatabase(t: TestContext) {
  if (!databaseReady) t.skip("Database is not reachable");
}

describe("sms and otp persistence", () => {
  let userId = "";
  let customerId = "";
  let projectId = "";
  let token = "";
  const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

  before(async () => {
    if (!getDatabaseUrl()) return;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      return;
    }
    databaseReady = true;
    process.env.AUTH_SECRET = process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32
      ? process.env.AUTH_SECRET
      : "test-auth-secret-must-be-32-characters-min";
    const stamp = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: "SMS Test",
        email: `sms-${stamp}@example.com`,
        passwordHash: "test",
        role: "CUSTOMER",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
        customer: { create: {} },
      },
      include: { customer: true },
    });
    userId = user.id;
    customerId = user.customer!.id;
    const project = await createApiProject({ customerId, name: `SMS ${stamp.slice(0, 8)}` });
    projectId = project.id;
    const key = await createProjectApiKey({
      projectId,
      name: "test",
      scopes: ["sms:send", "sms:read", "otp:send", "otp:verify"],
    });
    token = key.secret;
  });

  after(async () => {
    if (!userId) return;
    await prisma.rateLimitBucket.deleteMany({
      where: { OR: [{ key: { contains: projectId } }, { key: { contains: ip } }, { key: { contains: phone } }] },
    });
    await prisma.auditLog.deleteMany({ where: { entityId: projectId } });
    await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
  });

  it("verifies the issued code and rejects the previous code after resend", async (t) => {
    requireDatabase(t);
    const first = await sendOtp(
      { projectId, customerId, phone, purpose: "login", ip, resend: false },
      { generateCode: () => "111111", cooldownMs: 0 },
    );
    const second = await sendOtp(
      { projectId, customerId, phone, purpose: "login", ip, resend: true },
      { generateCode: () => "222222", cooldownMs: 0 },
    );
    assert.notEqual(first.request_id, second.request_id);
    assert.equal((await verifyOtp({ projectId, phone, purpose: "login", code: "111111" })).verified, false);
    assert.equal((await verifyOtp({ projectId, phone, purpose: "login", code: "222222" })).verified, true);
    assert.equal((await verifyOtp({ projectId, phone, purpose: "login", code: "222222" })).verified, false);
  });

  it("locks a code after the maximum attempts and expires an old code", async (t) => {
    requireDatabase(t);
    const sent = await sendOtp(
      { projectId, customerId, phone: "+233241110022", purpose: "signup", ip: `${ip}-b` },
      { generateCode: () => "333333", maxAttempts: 2, cooldownMs: 0 },
    );
    const invalid = await verifyOtp({ projectId, phone: "+233241110022", purpose: "signup", code: "000000" });
    const locked = await verifyOtp({ projectId, phone: "+233241110022", purpose: "signup", code: "000000" });
    assert.equal(invalid.verified, false);
    assert.equal(locked.verified, false);
    if (!invalid.verified) assert.equal(invalid.reason, "invalid");
    if (!locked.verified) assert.equal(locked.reason, "locked");

    const expiring = await sendOtp(
      { projectId, customerId, phone: "+233241110033", purpose: "login", ip: `${ip}-c` },
      { generateCode: () => "444444", cooldownMs: 0 },
    );
    await prisma.otpRequest.update({
      where: { id: expiring.request_id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const expired = await verifyOtp({ projectId, phone: "+233241110033", purpose: "login", code: "444444" });
    assert.equal(expired.verified, false);
    if (!expired.verified) assert.equal(expired.reason, "expired");
    assert.ok(sent.request_id);
  });

  it("enforces the resend cooldown", async (t) => {
    requireDatabase(t);
    await sendOtp(
      { projectId, customerId, phone: "+233241110044", purpose: "login", ip: `${ip}-d` },
      { generateCode: () => "555555", cooldownMs: 60_000 },
    );
    await assert.rejects(
      () =>
        sendOtp(
          { projectId, customerId, phone: "+233241110044", purpose: "login", ip: `${ip}-d`, resend: true },
          { generateCode: () => "666666", cooldownMs: 60_000 },
        ),
      (error: unknown) => error instanceof MessagingError && error.status === 429,
    );
  });

  it("queues one SMS per idempotency key and the worker clears the body", async (t) => {
    requireDatabase(t);
    const key = `idem-${randomUUID()}`;
    const first = await queueSms({
      projectId,
      customerId,
      to: "+233241110055",
      body: "Hello from MyDomain",
      senderId: "MyDomain",
      type: "SMS",
      idempotencyKey: key,
      endpoint: "sms.send",
    });
    const second = await queueSms({
      projectId,
      customerId,
      to: "+233241110055",
      body: "Hello from MyDomain",
      senderId: "MyDomain",
      type: "SMS",
      idempotencyKey: key,
      endpoint: "sms.send",
    });
    assert.equal(first.message.id, second.message.id);
    assert.equal(second.reused, true);
    const usage = await prisma.usageRecord.count({ where: { messageId: first.message.id } });
    assert.equal(usage, 1);
    assert.ok(first.message.bodyEnc);
    assert.equal(first.message.bodyPreview.includes("Hello"), true);

    const processed = await processSmsBatch(20, projectId);
    assert.ok(processed >= 1);
    const saved = await prisma.smsMessage.findUnique({ where: { id: first.message.id } });
    assert.equal(saved?.status, "DELIVERED");
    assert.equal(saved?.bodyEnc, null);
    assert.equal(saved?.route, "mock");
  });

  it("stops retrying a temporary mock failure", async (t) => {
    requireDatabase(t);
    const queued = await queueSms({
      projectId,
      customerId,
      to: "+233241110066",
      body: "retry me",
      senderId: "MyDomain",
      type: "SMS",
      metadata: { mockOutcome: "temporary" },
      endpoint: "sms.send",
    });
    await processSmsBatch(20, projectId);
    const retried = await prisma.smsMessage.findUnique({ where: { id: queued.message.id } });
    assert.equal(retried?.status, "QUEUED");
    assert.equal(retried?.retryCount, 1);
    assert.ok(retried?.bodyEnc);
    await prisma.smsMessage.update({
      where: { id: queued.message.id },
      data: { maxRetries: 1, nextAttemptAt: new Date() },
    });
    await processSmsBatch(20, projectId);
    const saved = await prisma.smsMessage.findUnique({ where: { id: queued.message.id } });
    assert.equal(saved?.status, "FAILED");
    assert.equal(saved?.errorCode, "MOCK_TEMPORARY");
    assert.equal(saved?.bodyEnc, null);
  });

  it("authenticates the HTTP API and never returns an OTP", async (t) => {
    requireDatabase(t);
    const denied = await sendRoute(
      new Request("http://localhost/api/v1/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: "+233241110077", purpose: "login" }),
      }),
    );
    assert.equal(denied.status, 401);

    const response = await sendRoute(
      new Request("http://localhost/api/v1/otp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-forwarded-for": `${ip}-http`,
        },
        body: JSON.stringify({ phone: "+233 241 110 077", purpose: "login" }),
      }),
    );
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.success, true);
    assert.equal(typeof payload.request_id, "string");
    assert.equal(payload.expires_in, 300);
    assert.equal("code" in payload, false);
    assert.equal(JSON.stringify(payload).includes("verification code"), false);

    const wrong = await verifyRoute(
      new Request("http://localhost/api/v1/otp/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-forwarded-for": `${ip}-verify`,
        },
        body: JSON.stringify({ phone: "+233241110077", code: "000000", purpose: "login" }),
      }),
    );
    const wrongBody = await wrong.json();
    assert.equal(wrongBody.verified, false);

    const sms = await smsRoute(
      new Request("http://localhost/api/v1/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": `http-${randomUUID()}`,
        },
        body: JSON.stringify({ to: "+233241110088", message: "Queued hello", sender_id: "MyDomain" }),
      }),
    );
    const smsBody = await sms.json();
    assert.equal(sms.status, 200);
    assert.equal(smsBody.status, "queued");
  });
});
