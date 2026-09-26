import { z } from "zod";
import { handleMessagingError, idempotencyKey, messagingOk } from "@/lib/messaging/http";
import { publicStatus } from "@/lib/messaging/status";
import { requireApiKey } from "@/lib/security/api-key-guard";
import { queueSms } from "@/lib/services/messaging.service";

const schema = z.object({
  to: z.string().min(8).max(24),
  message: z.string().min(1).max(640),
  sender_id: z.string().min(1).max(11),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiKey(request, "sms:send");
    const body = schema.parse(await request.json());
    const queued = await queueSms({
      projectId: auth.projectId,
      customerId: auth.customerId,
      apiKeyId: auth.keyId,
      to: body.to,
      body: body.message,
      senderId: body.sender_id,
      type: "SMS",
      metadata: body.metadata,
      idempotencyKey: idempotencyKey(request),
      endpoint: "sms.send",
    });
    return messagingOk({
      message_id: queued.message.id,
      status: publicStatus(queued.message.status),
    });
  } catch (error) {
    return handleMessagingError(error);
  }
}
