import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { deleteHostingProject } from "@/lib/services/hosting.service";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const account = await deleteHostingProject({
      customerId: session.customerId,
      hostingId: id,
      actorId: session.sub,
    });
    if (!account) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ deleted: true, id: account.id });
  } catch (error) {
    return handleRouteError(error);
  }
}