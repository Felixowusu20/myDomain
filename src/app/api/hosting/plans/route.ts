import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { listPlans } from "@/lib/services/hosting.service";

export async function GET() {
  try {
    return jsonOk({ plans: await listPlans() });
  } catch (error) {
    return handleRouteError(error);
  }
}
