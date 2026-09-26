import { z } from "zod";
import { handleMessagingError, messagingOk } from "@/lib/messaging/http";
import { requireApiKey } from "@/lib/security/api-key-guard";
import { verifyOtp } from "@/lib/services/otp.service";

const schema = z.object({
  phone: z.string().min(8).max(24),
  code: z.string().min(4).max(12),
  purpose: z.string().min(2).max(32),
});

export async function POST(request: Request) {
  try {
    const auth = await requireApiKey(request, "otp:verify");
    const body = schema.parse(await request.json());
    const result = await verifyOtp({
      projectId: auth.projectId,
      phone: body.phone,
      purpose: body.purpose,
      code: body.code,
    });
    return messagingOk({ verified: result.verified });
  } catch (error) {
    return handleMessagingError(error);
  }
}
