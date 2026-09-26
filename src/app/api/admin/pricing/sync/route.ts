import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { audit } from "@/lib/audit";
import { syncNamecomPricing } from "@/lib/providers/namecom/sync";

const schema = z.object({
  resetMargins: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await request.json().catch(() => ({})));
    const result = await syncNamecomPricing({ resetMargins: body.resetMargins === true });
    await audit({
      actorId: admin.sub,
      action: body.resetMargins ? "pricing.reset_margins" : "pricing.sync",
      entityType: "TldPricing",
      metadata: result,
    });
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
