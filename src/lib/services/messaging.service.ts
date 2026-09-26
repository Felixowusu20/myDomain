import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { encryptSecret } from "@/lib/crypto";
import { smsConfig } from "@/lib/messaging/config";
import { MessagingError } from "@/lib/messaging/errors";
import { consumeDurableLimit } from "@/lib/messaging/limits";
import { logMessaging } from "@/lib/messaging/log";
import { maskPhone, normalizePhone } from "@/lib/messaging/phone";
import { publicStatus } from "@/lib/messaging/status";
import { assertActiveSender } from "@/lib/services/api-project.service";
import { recordSmsUsage } from "@/lib/services/usage.service";

type QueueInput = {
  projectId: string;
  customerId: string;
  apiKeyId?: string | null;
  to: string;
  body: string;
  senderId: string;
  type: "SMS" | "OTP";
  purpose?: string | null;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string | null;
  endpoint: string;
};

export function previewFor(type: "SMS" | "OTP", body: string) {
  if (type === "OTP") return "Verification code message";
  const compact = body.replace(/\s+/g, " ").trim();
  return compact.length > 80 ? `${compact.slice(0, 77)}...` : compact;
}

export function publicMessage(message: {
  id: string;
  status: string;
  toE164: string;
  senderId: string;
  type: string;
  route: string;
  errorCode: string | null;
  retryCount: number;
  queuedAt: Date;
  sentAt: Date | null;
  deliveredAt: Date | null;
}) {
  return {
    message_id: message.id,
    status: publicStatus(message.status),
    to: maskPhone(message.toE164),
    sender_id: message.senderId,
    type: message.type.toLowerCase(),
    route: message.route,
    error_code: message.errorCode,
    retry_count: message.retryCount,
    queued_at: message.queuedAt.toISOString(),
    sent_at: message.sentAt?.toISOString() ?? null,
    delivered_at: message.deliveredAt?.toISOString() ?? null,
  };
}

function isUniqueConflict(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
}

async function findIdempotent(projectId: string, idempotencyKey: string) {
  return prisma.smsMessage.findUnique({
    where: { projectId_idempotencyKey: { projectId, idempotencyKey } },
  });
}

export async function queueSms(input: QueueInput) {
  const phone = normalizePhone(input.to);
  const sender = await assertActiveSender(input.projectId, input.senderId);
  const body = input.body;
  if (input.type === "SMS") {
    const text = body.trim();
    if (!text || text.length > 640) {
      throw new MessagingError("Message must be between 1 and 640 characters.");
    }
  }
  if (!body.trim()) throw new MessagingError("Message is empty.");

  if (input.idempotencyKey) {
    const existing = await findIdempotent(input.projectId, input.idempotencyKey);
    if (existing) return { message: existing, reused: true as const };
  }

  if (input.type === "SMS") {
    const limits = smsConfig();
    const decision = await consumeDurableLimit(
      `sms:project:${input.projectId}`,
      limits.maxPerProject,
      limits.windowMs,
    );
    if (!decision.ok) throw new MessagingError("Too many messages. Please wait a moment.", 429);
  }

  try {
    const message = await prisma.smsMessage.create({
      data: {
        projectId: input.projectId,
        apiKeyId: input.apiKeyId ?? null,
        toE164: phone,
        bodyEnc: encryptSecret(body),
        bodyPreview: previewFor(input.type, body),
        senderId: sender,
        type: input.type,
        purpose: input.purpose ?? null,
        status: "QUEUED",
        route: "pending",
        idempotencyKey: input.idempotencyKey ?? `auto_${randomUUID()}`,
        metadataJson: JSON.stringify(input.metadata ?? {}),
        maxRetries: smsConfig().maxRetries,
      },
    });
    await recordSmsUsage({
      projectId: input.projectId,
      customerId: input.customerId,
      apiKeyId: input.apiKeyId,
      messageId: message.id,
      endpoint: input.endpoint,
      destination: phone,
      messageType: input.type,
    });
    await audit({
      action: input.type === "OTP" ? "otp.queued" : "sms.queued",
      entityType: "SmsMessage",
      entityId: message.id,
      metadata: {
        projectId: input.projectId,
        to: maskPhone(phone),
        type: input.type,
        endpoint: input.endpoint,
      },
    });
    logMessaging("sms.queued", {
      messageId: message.id,
      projectId: input.projectId,
      to: maskPhone(phone),
      type: input.type,
    });
    return { message, reused: false as const };
  } catch (error) {
    if (input.idempotencyKey && isUniqueConflict(error)) {
      const existing = await findIdempotent(input.projectId, input.idempotencyKey);
      if (existing) return { message: existing, reused: true as const };
    }
    throw error;
  }
}

export async function getProjectMessage(projectId: string, messageId: string) {
  const message = await prisma.smsMessage.findFirst({
    where: { id: messageId, projectId },
  });
  if (!message) throw new MessagingError("Message not found.", 404);
  return message;
}
