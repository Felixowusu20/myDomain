import { jsonError, jsonOk } from "@/lib/api";
import { withDbRetry } from "@/lib/db-postgres";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { getCustomerHosting, publicHosting } from "@/lib/services/hosting.service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const account = await withDbRetry(() => getCustomerHosting(session.customerId, id));
    if (!account) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ account: publicHosting(account) });
  } catch (error) {
    return handleRouteError(error);
  }
}
