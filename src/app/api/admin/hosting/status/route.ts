import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { adminSetHostingStatus } from "@/lib/services/hosting.service";

const schema = z.object({
  id: z.string(),
  status: z.enum(["RUNNING", "SUSPENDED", "TERMINATED"]),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await request.json());
    const account = await adminSetHostingStatus(body.id, body.status, admin.sub);
    return jsonOk({ account });
  } catch (error) {
    return handleRouteError(error);
  }
}
