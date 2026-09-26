import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { updateNameservers } from "@/lib/services/domain.service";

const schema = z.object({
  nameservers: z.array(z.string().min(3)).min(2).max(4),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const domain = await updateNameservers(session.customerId, id, body.nameservers);
    if (!domain) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ domain });
  } catch (error) {
    return handleRouteError(error);
  }
}
