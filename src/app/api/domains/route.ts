import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { listCustomerDomains } from "@/lib/services/domain.service";

export async function GET() {
  try {
    const session = await requireCustomer();
    return jsonOk({ domains: await listCustomerDomains(session.customerId) });
  } catch (error) {
    return handleRouteError(error);
  }
}
