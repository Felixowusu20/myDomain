import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { setDomainPrivacy } from "@/lib/services/domain.service";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

const schema = z.object({ enabled: z.boolean() });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    if (!rateLimit(`domain-privacy:${session.customerId}:${clientIp(request)}`, 10, 60_000).ok) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const domain = await setDomainPrivacy(session.customerId, id, body.enabled);
    if (!domain) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ domain });
  } catch (error) {
    return handleRouteError(error);
  }
}
