import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const orders = await prisma.order.findMany({
      include: { customer: { include: { user: true } }, items: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ orders });
  } catch (error) {
    return handleRouteError(error);
  }
}
