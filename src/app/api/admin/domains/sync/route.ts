import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { syncNamecomDomains, syncNamecomTransfers } from "@/lib/providers/namecom/sync";

export async function POST() {
  try {
    const admin = await requireAdmin();
    const domains = await syncNamecomDomains();
    const transfers = await syncNamecomTransfers().catch(() => ({ synced: 0 }));
    const result = { ...domains, transfers: transfers.synced };
    await audit({
      actorId: admin.sub,
      action: "domains.sync",
      entityType: "Domain",
      metadata: result,
    });
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
