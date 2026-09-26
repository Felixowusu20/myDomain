import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { runBackgroundJobs, systemHealth } from "@/lib/jobs/runner";

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk(await systemHealth());
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST() {
  try {
    await requireAdmin();
    const result = await runBackgroundJobs();
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
