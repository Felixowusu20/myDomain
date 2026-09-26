import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { handleNamecomWebhook } from "@/lib/providers/namecom/webhooks";
import { verifyNamecomWebhookSignature } from "@/lib/providers/namecom/webhook-signature";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export async function POST(request: Request) {
  try {
    if (!rateLimit(`webhook:namecom:${clientIp(request)}`, 120, 60_000).ok) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }

    const raw = await request.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw || "{}") as Record<string, unknown>;
    } catch {
      return jsonError("Invalid JSON payload.", 400);
    }

    try {
      verifyNamecomWebhookSignature({
        payload: body,
        headerValue: request.headers.get("x-namecom-signature"),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid webhook signature.";
      return jsonError(message, 401);
    }

    const result = await handleNamecomWebhook(body);
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
