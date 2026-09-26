import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { adminDashboard } from "@/lib/services/admin.service";
import { systemHealth } from "@/lib/jobs/runner";

export async function GET() {
  try {
    await requireAdmin();
    const [dashboard, health] = await Promise.all([adminDashboard(), systemHealth()]);
    return jsonOk({ ...dashboard, health });
  } catch (error) {
    return handleRouteError(error);
  }
}
