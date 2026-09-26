import { prisma } from "@/lib/db";
import { processSmsBatch } from "@/lib/messaging/queue";
import { logMessaging } from "@/lib/messaging/log";
import { maskPhone, normalizePhone } from "@/lib/messaging/phone";
import { apiSecretMatches, parseApiToken, parseScopes } from "@/lib/security/api-key";
import { queueSms } from "@/lib/services/messaging.service";

/** Queue a signup text through the platform SMS key so it shows in SMS & OTP. */
export async function notifyAccountCreated(input: { name: string; phone: string }) {
  const token = process.env.SMS_PLATFORM_API_KEY?.trim();
  if (!token) return;
  const parsed = parseApiToken(token);
  if (!parsed) {
    logMessaging("signup.sms.skipped", { reason: "invalid_platform_key" });
    return;
  }
  const key = await prisma.apiKey.findUnique({
    where: { prefix: parsed.prefix },
    include: { project: true },
  });
  if (!key || key.status !== "ACTIVE" || key.project.status !== "ACTIVE") return;
  if (!apiSecretMatches(parsed.secret, key.secretHash)) return;
  if (!parseScopes(key.scopesJson).includes("sms:send")) return;

  const phone = normalizePhone(input.phone);
  const name = input.name.trim().slice(0, 80) || "Someone";
  await queueSms({
    projectId: key.projectId,
    customerId: key.project.customerId,
    apiKeyId: key.id,
    to: phone,
    body: `MyDomain: ${name} created an account with this phone number.`,
    senderId: key.project.defaultSender,
    type: "SMS",
    purpose: "signup",
    endpoint: "account.signup",
    idempotencyKey: `signup_${phone}`,
  });
  await processSmsBatch(5, key.projectId);
  logMessaging("signup.sms.queued", { to: maskPhone(phone) });
}
