import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { renewCustomerDomain } from "@/lib/services/domain.service";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    if (!rateLimit(`domain-renew:${session.customerId}:${clientIp(request)}`, 6, 60_000).ok) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }
    const { id } = await context.params;
    const domain = await renewCustomerDomain(session.customerId, id, 1);
    if (!domain) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ domain });
  } catch (error) {
    return handleRouteError(error);
  }
}
