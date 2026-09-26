import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { decryptSecret } from "@/lib/crypto";
import { logMessaging } from "@/lib/messaging/log";
import { maskPhone } from "@/lib/messaging/phone";
import { resolveConnector } from "@/lib/messaging/router";
import { canTransition, retryDelayMs, type SmsStatus } from "@/lib/messaging/status";
import { parseJson } from "@/lib/utils";

type ClaimedMessage = NonNullable<Awaited<ReturnType<typeof prisma.smsMessage.findUnique>>>;

export async function processSmsBatch(limit = 20, projectId?: string) {
  const ids = await claimMessageIds(limit, projectId);
  for (const id of ids) {
    await processClaimedMessage(id);
  }
  return ids.length;
}

async function claimMessageIds(limit: number, projectId?: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    WITH picked AS (
      SELECT id FROM "SmsMessage"
      WHERE (
        (
          status = 'QUEUED'::"SmsMessageStatus"
          AND "nextAttemptAt" <= NOW()
        ) OR (
          status = 'PROCESSING'::"SmsMessageStatus"
          AND "lockedAt" IS NOT NULL
          AND "lockedAt" < NOW() - INTERVAL '2 minutes'
        )
      )
      ${projectId ? Prisma.sql`AND "projectId" = ${projectId}` : Prisma.empty}
      ORDER BY "nextAttemptAt" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE "SmsMessage" AS m
    SET
      status = 'PROCESSING'::"SmsMessageStatus",
      "lockedAt" = NOW(),
      "updatedAt" = NOW()
    FROM picked
    WHERE m.id = picked.id
    RETURNING m.id
  `);
  return rows.map((row) => row.id);
}

async function processClaimedMessage(id: string) {
  const message = await prisma.smsMessage.findUnique({ where: { id } });
  if (!message || message.status !== "PROCESSING") return;
  if (!canTransition("QUEUED", "PROCESSING") && message.status !== "PROCESSING") return;

  const started = Date.now();
  const connector = resolveConnector({
    to: message.toE164,
    senderId: message.senderId,
    type: message.type,
  });

  if (!message.bodyEnc) {
    await finishTerminal(message, "FAILED", "MISSING_BODY", connector.id);
    return;
  }

  let body = "";
  try {
    body = decryptSecret(message.bodyEnc);
  } catch {
    await finishTerminal(message, "FAILED", "BODY_UNREADABLE", connector.id);
    return;
  }

  const metadata = parseJson<Record<string, unknown>>(message.metadataJson, {});
  try {
    const result = await connector.send({
      messageId: message.id,
      to: message.toE164,
      body,
      senderId: message.senderId,
      metadata,
    });
    await prisma.messageAttempt.create({
      data: {
        messageId: message.id,
        connector: connector.id,
        status: result.status,
        errorCode: result.errorCode ?? null,
        finishedAt: new Date(),
      },
    });

    if (result.status === "SENT" && result.providerMessageId) {
      let status: SmsStatus = "SENT";
      const receipt = await connector.getDeliveryStatus(result.providerMessageId);
      if (receipt.status === "DELIVERED" && canTransition("SENT", "DELIVERED")) {
        status = "DELIVERED";
        if (receipt.simulated) {
          logMessaging("sms.delivery.simulated", { messageId: message.id, connector: connector.id });
        }
      }
      await prisma.smsMessage.update({
        where: { id: message.id },
        data: {
          status,
          providerRef: result.providerMessageId,
          route: connector.id,
          bodyEnc: null,
          sentAt: new Date(),
          deliveredAt: status === "DELIVERED" ? new Date() : null,
          errorCode: null,
          lockedAt: null,
        },
      });
      logMessaging("sms.processed", {
        messageId: message.id,
        status,
        route: connector.id,
        sendMs: Date.now() - started,
        queueMs: Math.max(0, Date.now() - message.queuedAt.getTime()),
        retryCount: message.retryCount,
        to: maskPhone(message.toE164),
        simulated: connector.developmentOnly,
      });
      return;
    }

    if (result.retryable) {
      await scheduleRetry(message, result.errorCode ?? "SEND_FAILED", connector.id);
      return;
    }

    await finishTerminal(
      message,
      result.status === "REJECTED" ? "REJECTED" : "FAILED",
      result.errorCode ?? "SEND_FAILED",
      connector.id,
    );
  } catch {
    logMessaging("sms.send.error", { messageId: message.id, retryCount: message.retryCount });
    await scheduleRetry(message, "CONNECTOR_ERROR", connector.id);
  }
}

async function scheduleRetry(message: ClaimedMessage, errorCode: string, connectorId: string) {
  const nextRetry = message.retryCount + 1;
  if (nextRetry >= message.maxRetries) {
    await finishTerminal(message, "FAILED", errorCode, connectorId);
    return;
  }
  await prisma.messageAttempt.create({
    data: {
      messageId: message.id,
      connector: connectorId,
      status: "RETRY",
      errorCode,
      finishedAt: new Date(),
    },
  });
  await prisma.smsMessage.update({
    where: { id: message.id },
    data: {
      status: "QUEUED",
      retryCount: nextRetry,
      nextAttemptAt: new Date(Date.now() + retryDelayMs(nextRetry)),
      errorCode,
      route: connectorId,
      lockedAt: null,
    },
  });
  logMessaging("sms.retry", {
    messageId: message.id,
    retryCount: nextRetry,
    errorCode,
    to: maskPhone(message.toE164),
  });
}

async function finishTerminal(
  message: ClaimedMessage,
  status: "FAILED" | "REJECTED" | "EXPIRED",
  errorCode: string,
  connectorId: string,
) {
  if (!canTransition(message.status, status) && message.status !== "PROCESSING") return;
  await prisma.smsMessage.update({
    where: { id: message.id },
    data: {
      status,
      errorCode,
      route: connectorId,
      bodyEnc: null,
      failedAt: new Date(),
      lockedAt: null,
    },
  });
  logMessaging("sms.failed", {
    messageId: message.id,
    status,
    errorCode,
    to: maskPhone(message.toE164),
    retryCount: message.retryCount,
  });
}
