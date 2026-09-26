import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { assertOwnedKey, revokeProjectApiKey, rotateProjectApiKey } from "@/lib/services/api-project.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    await assertOwnedKey(session.customerId, id);
    const action = new URL(request.url).searchParams.get("action");
    if (action === "rotate") {
      const key = await rotateProjectApiKey(id, session.sub);
      return jsonOk({ key });
    }
    await revokeProjectApiKey(id, session.sub);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
