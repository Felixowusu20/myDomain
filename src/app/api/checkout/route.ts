import { z } from "zod";
import { jsonCreated, jsonError } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { checkoutCart } from "@/lib/services/billing.service";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

const schema = z.object({ fail: z.boolean().optional() });

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    if (!rateLimit(`checkout:${session.customerId}:${clientIp(request)}`, 8, 60_000).ok) {
      return jsonError("Too many checkout attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json().catch(() => ({})));
    const result = await checkoutCart({
      customerId: session.customerId,
      actorId: session.sub,
      fail: body.fail,
    });
    return jsonCreated(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
