import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { setAutoRenew } from "@/lib/services/domain.service";

const schema = z.object({ enabled: z.boolean() });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const domain = await setAutoRenew(session.customerId, id, body.enabled);
    return jsonOk({ domain });
  } catch (error) {
    return handleRouteError(error);
  }
}
