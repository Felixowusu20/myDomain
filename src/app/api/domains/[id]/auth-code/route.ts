import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { getDomainAuthCode } from "@/lib/services/domain.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const authCode = await getDomainAuthCode(session.customerId, id);
    if (!authCode) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ authCode });
  } catch (error) {
    return handleRouteError(error);
  }
}
