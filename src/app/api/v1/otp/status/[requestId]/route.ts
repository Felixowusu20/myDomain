import { handleMessagingError, messagingOk } from "@/lib/messaging/http";
import { requireApiKey } from "@/lib/security/api-key-guard";
import { getOtpStatus } from "@/lib/services/otp.service";

export async function GET(request: Request, context: { params: Promise<{ requestId: string }> }) {
  try {
    const auth = await requireApiKey(request, ["otp:send", "otp:verify"]);
    const { requestId } = await context.params;
    const status = await getOtpStatus(auth.projectId, requestId);
    return messagingOk(status);
  } catch (error) {
    return handleMessagingError(error);
  }
}
