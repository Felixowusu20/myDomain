import { z } from "zod";
import { handleMessagingError, idempotencyKey, messagingOk } from "@/lib/messaging/http";
import { clientIp } from "@/lib/request-ip";
import { requireApiKey } from "@/lib/security/api-key-guard";
import { sendOtp } from "@/lib/services/otp.service";

const schema = z.object({
  phone: z.string().min(8).max(24),
  purpose: z.string().min(2).max(32),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiKey(request, "otp:send");
    const body = schema.parse(await request.json());
    const result = await sendOtp({
      projectId: auth.projectId,
      customerId: auth.customerId,
      apiKeyId: auth.keyId,
      phone: body.phone,
      purpose: body.purpose,
      ip: clientIp(request),
      idempotencyKey: idempotencyKey(request),
    });
    return messagingOk(result);
  } catch (error) {
    return handleMessagingError(error);
  }
}
