import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { cancelInboundTransfer } from "@/lib/services/domain.service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const domain = await cancelInboundTransfer(session.customerId, id);
    if (!domain) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ domain });
  } catch (error) {
    return handleRouteError(error);
  }
}
