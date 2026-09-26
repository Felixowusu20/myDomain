import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { customerBilling, getCart } from "@/lib/services/billing.service";

export async function GET() {
  try {
    const session = await requireCustomer();
    const billing = await customerBilling(session.customerId);
    return jsonOk({ orders: billing.orders });
  } catch (error) {
    return handleRouteError(error);
  }
}
