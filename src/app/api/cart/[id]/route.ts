import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { removeCartItem } from "@/lib/services/billing.service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await params;
    await removeCartItem(session.customerId, id);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
