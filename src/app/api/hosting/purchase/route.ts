import { z } from "zod";
import { jsonCreated } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { addCartItem } from "@/lib/services/billing.service";

const schema = z.object({
  planSlug: z.string().min(1),
  hostingId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    const body = schema.parse(await request.json());
    const plan = await prisma.hostingPlan.findUnique({ where: { slug: body.planSlug } });
    if (!plan) throw new Error("Plan not found");
    await addCartItem(session.customerId, {
      type: "HOSTING",
      description: `Hosting · ${plan.name} Plan`,
      amountCents: plan.yearlyCents,
      meta: { planSlug: plan.slug, hostingId: body.hostingId },
    });
    return jsonCreated({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
