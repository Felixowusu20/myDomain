import { handleMessagingError, messagingOk } from "@/lib/messaging/http";
import { requireApiKey } from "@/lib/security/api-key-guard";
import { getProjectMessage, publicMessage } from "@/lib/services/messaging.service";

export async function GET(request: Request, context: { params: Promise<{ messageId: string }> }) {
  try {
    const auth = await requireApiKey(request, "sms:read");
    const { messageId } = await context.params;
    const message = await getProjectMessage(auth.projectId, messageId);
    return messagingOk(publicMessage(message));
  } catch (error) {
    return handleMessagingError(error);
  }
}
