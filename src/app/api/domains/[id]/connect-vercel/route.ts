import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { connectDomainToVercel } from "@/lib/services/domain.service";

const schema = z.object({
  method: z.enum(["records", "nameservers"]).default("records"),
  wwwCname: z.string().min(3).max(253).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const body = schema.parse(await request.json().catch(() => ({})));
    const result = await connectDomainToVercel(session.customerId, id, {
      method: body.method,
      wwwCname: body.wwwCname,
      actorId: session.sub,
    });
    if (!result) return jsonError("We couldn't find that domain.", 404);
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
