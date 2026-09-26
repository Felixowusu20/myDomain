import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { publicHosting, redeployHosting } from "@/lib/services/hosting.service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const account = await redeployHosting({
      customerId: session.customerId,
      hostingId: id,
      actorId: session.sub,
      userId: session.sub,
    });
    if (!account) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ account: publicHosting(account) });
  } catch (error) {
    return handleRouteError(error);
  }
}
