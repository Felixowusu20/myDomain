import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { clearCart, getCart } from "@/lib/services/billing.service";

export async function GET() {
  try {
    const session = await requireCustomer();
    return jsonOk(await getCart(session.customerId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE() {
  try {
    const session = await requireCustomer();
    await clearCart(session.customerId);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
