import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { otpConfig } from "@/lib/messaging/config";
import { MessagingError } from "@/lib/messaging/errors";
import { consumeDurableLimit } from "@/lib/messaging/limits";
import { logMessaging } from "@/lib/messaging/log";
import { generateOtpCode, hashOtp, normalizeOtpCode, otpMatches } from "@/lib/messaging/otp-crypto";
import { maskPhone, normalizePhone } from "@/lib/messaging/phone";
import { assertActiveSender } from "@/lib/services/api-project.service";
import { queueSms } from "@/lib/services/messaging.service";

export type OtpPolicy = {
  generateCode?: () => string;
  ttlMs?: number;
  maxAttempts?: number;
  cooldownMs?: number;
};

type SendInput = {
  projectId: string;
  customerId: string;
  apiKeyId?: string | null;
  phone: string;
  purpose: string;
  ip: string;
  idempotencyKey?: string | null;
  resend?: boolean;
};

function normalizePurpose(purpose: string) {
  const value = purpose.trim().toLowerCase();
  if (!/^[a-z0-9_-]{2,32}$/.test(value)) {
    throw new MessagingError("Purpose must be 2 to 32 letters, numbers, hyphens, or underscores.");
  }
  return value;
}

function present(otp: { id: string; expiresAt: Date }) {
  return {
    request_id: otp.id,
    expires_in: Math.max(0, Math.ceil((otp.expiresAt.getTime() - Date.now()) / 1000)),
  };
}

function publicOtpStatus(otp: {
  consumedAt: Date | null;
  invalidatedAt: Date | null;
  attempts: number;
  maxAttempts: number;
  expiresAt: Date;
}) {
  if (otp.consumedAt) return "verified";
  if (otp.invalidatedAt && otp.attempts >= otp.maxAttempts) return "locked";
  if (otp.invalidatedAt) return "invalidated";
  if (otp.expiresAt <= new Date()) return "expired";
  if (otp.attempts >= otp.maxAttempts) return "locked";
  return "pending";
}

async function projectSender(projectId: string) {
  const project = await prisma.apiProject.findUnique({ where: { id: projectId } });
  if (!project || project.status !== "ACTIVE") throw new MessagingError("Project not found.", 404);
  return assertActiveSender(projectId, project.defaultSender);
}

async function enforceSendLimits(input: SendInput, phone: string) {
  const cfg = otpConfig();
  const checks: Array<[string, number]> = [
    [`otp:phone:${input.projectId}:${phone}`, cfg.maxPerPhone],
    [`otp:ip:${input.ip || "local"}`, cfg.maxPerIp],
    [`otp:project:${input.projectId}`, cfg.maxPerProject],
  ];
  for (const [key, limit] of checks) {
    const decision = await consumeDurableLimit(key, limit, cfg.windowMs);
    if (!decision.ok) {
      await audit({
        action: "otp.rate_limited",
        entityType: "ApiProject",
        entityId: input.projectId,
        metadata: { phone: maskPhone(phone), bucket: key.split(":")[1] ?? "limit" },
      });
      logMessaging("otp.rate_limited", {
        projectId: input.projectId,
        phone: maskPhone(phone),
      });
      throw new MessagingError("Too many verification requests. Please wait a moment.", 429);
    }
  }
}

export async function sendOtp(input: SendInput, policy: OtpPolicy = {}) {
  const cfg = otpConfig();
  const phone = normalizePhone(input.phone);
  const purpose = normalizePurpose(input.purpose);
  const ttlMs = policy.ttlMs ?? cfg.ttlSeconds * 1000;
  const maxAttempts = policy.maxAttempts ?? cfg.maxAttempts;
  const cooldownMs = policy.cooldownMs ?? cfg.resendCooldownMs;
  const length = cfg.length;

  if (input.idempotencyKey) {
    const existing = await prisma.smsMessage.findUnique({
      where: {
        projectId_idempotencyKey: { projectId: input.projectId, idempotencyKey: input.idempotencyKey },
      },
      include: { otpRequest: true },
    });
    if (existing?.otpRequest) return present(existing.otpRequest);
    if (existing) throw new MessagingError("That idempotency key was already used.", 409);
  }

  const latest = await prisma.otpRequest.findFirst({
    where: { projectId: input.projectId, phoneE164: phone, purpose },
    orderBy: { createdAt: "desc" },
  });
  if (input.resend && !latest) {
    throw new MessagingError("There is no verification to resend.", 404);
  }
  if (latest && Date.now() - latest.createdAt.getTime() < cooldownMs) {
    const retryAfter = Math.max(1, Math.ceil((cooldownMs - (Date.now() - latest.createdAt.getTime())) / 1000));
    throw new MessagingError(`Wait ${retryAfter} seconds before requesting another code.`, 429);
  }

  await enforceSendLimits(input, phone);

  const code = policy.generateCode?.() ?? generateOtpCode(length);
  if (!new RegExp(`^\\d{${length}}$`).test(code)) {
    throw new MessagingError("Could not create a verification code.", 500);
  }

  const minutes = Math.max(1, Math.round(ttlMs / 60_000));
  const sender = await projectSender(input.projectId);
  const queued = await queueSms({
    projectId: input.projectId,
    customerId: input.customerId,
    apiKeyId: input.apiKeyId,
    to: phone,
    body: `Your verification code is ${code}. It expires in ${minutes} minutes.`,
    senderId: sender,
    type: "OTP",
    purpose,
    idempotencyKey: input.idempotencyKey,
    endpoint: input.resend ? "otp.resend" : "otp.send",
  });

  if (queued.reused) {
    const existing = await prisma.otpRequest.findUnique({ where: { smsMessageId: queued.message.id } });
    if (existing) return present(existing);
    throw new MessagingError("That idempotency key was already used.", 409);
  }

  const expiresAt = new Date(Date.now() + ttlMs);
  const otp = await prisma.$transaction(async (tx) => {
    await tx.otpRequest.updateMany({
      where: {
        projectId: input.projectId,
        phoneE164: phone,
        purpose,
        consumedAt: null,
        invalidatedAt: null,
      },
      data: { invalidatedAt: new Date() },
    });
    return tx.otpRequest.create({
      data: {
        projectId: input.projectId,
        phoneE164: phone,
        purpose,
        codeHash: hashOtp(input.projectId, phone, purpose, code),
        smsMessageId: queued.message.id,
        expiresAt,
        maxAttempts,
      },
    });
  });

  logMessaging("otp.requested", {
    requestId: otp.id,
    projectId: input.projectId,
    phone: maskPhone(phone),
    purpose,
  });
  return present(otp);
}

export async function verifyOtp(input: {
  projectId: string;
  phone: string;
  purpose: string;
  code: string;
}) {
  const cfg = otpConfig();
  const phone = normalizePhone(input.phone);
  const purpose = normalizePurpose(input.purpose);
  const code = normalizeOtpCode(input.code);
  const otp = await prisma.otpRequest.findFirst({
    where: { projectId: input.projectId, phoneE164: phone, purpose, invalidatedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const comparisonHash = otp?.codeHash ?? hashOtp(input.projectId, phone, purpose, "0".repeat(cfg.length));
  const matches = otpMatches(input.projectId, phone, purpose, code, comparisonHash);

  if (!otp || otp.consumedAt) {
    logMessaging("otp.verify.failed", { projectId: input.projectId, phone: maskPhone(phone), reason: "invalid" });
    return { verified: false as const, reason: "invalid" as const };
  }
  if (otp.expiresAt <= new Date()) {
    logMessaging("otp.verify.failed", { projectId: input.projectId, phone: maskPhone(phone), reason: "expired" });
    return { verified: false as const, reason: "expired" as const };
  }
  if (otp.attempts >= otp.maxAttempts) {
    return { verified: false as const, reason: "locked" as const };
  }
  if (!matches) {
    const nextAttempts = otp.attempts + 1;
    const locked = nextAttempts >= otp.maxAttempts;
    await prisma.otpRequest.update({
      where: { id: otp.id },
      data: locked ? { attempts: nextAttempts, invalidatedAt: new Date() } : { attempts: nextAttempts },
    });
    logMessaging("otp.verify.failed", {
      requestId: otp.id,
      projectId: input.projectId,
      phone: maskPhone(phone),
      reason: locked ? "locked" : "invalid",
    });
    await audit({
      action: "otp.failed",
      entityType: "OtpRequest",
      entityId: otp.id,
      metadata: { phone: maskPhone(phone), purpose, reason: locked ? "locked" : "invalid" },
    });
    return { verified: false as const, reason: locked ? ("locked" as const) : ("invalid" as const) };
  }

  await prisma.otpRequest.update({
    where: { id: otp.id },
    data: { consumedAt: new Date() },
  });
  logMessaging("otp.verified", { requestId: otp.id, projectId: input.projectId, phone: maskPhone(phone) });
  await audit({
    action: "otp.verified",
    entityType: "OtpRequest",
    entityId: otp.id,
    metadata: { phone: maskPhone(phone), purpose },
  });
  return { verified: true as const };
}

export async function getOtpStatus(projectId: string, requestId: string) {
  const otp = await prisma.otpRequest.findFirst({ where: { id: requestId, projectId } });
  if (!otp) throw new MessagingError("Verification request not found.", 404);
  return {
    request_id: otp.id,
    status: publicOtpStatus(otp),
    expires_in: Math.max(0, Math.ceil((otp.expiresAt.getTime() - Date.now()) / 1000)),
    phone: maskPhone(otp.phoneE164),
    purpose: otp.purpose,
  };
}
