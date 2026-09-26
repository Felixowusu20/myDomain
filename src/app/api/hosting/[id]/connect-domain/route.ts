import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { connectDomainToHosting } from "@/lib/services/hosting.service";

const schema = z.object({ domainId: z.string().min(1) });

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const account = await connectDomainToHosting({
      customerId: session.customerId,
      hostingId: id,
      domainId: body.domainId,
    });
    if (!account) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ account });
  } catch (error) {
    return handleRouteError(error);
  }
}
