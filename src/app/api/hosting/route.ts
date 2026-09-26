import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { listCustomerHosting, publicHosting } from "@/lib/services/hosting.service";

export async function GET() {
  try {
    const session = await requireCustomer();
    const accounts = await listCustomerHosting(session.customerId);
    return jsonOk({ accounts: accounts.map(publicHosting) });
  } catch (error) {
    return handleRouteError(error);
  }
}
