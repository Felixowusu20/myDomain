import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const payments = await prisma.payment.findMany({
      include: { customer: { include: { user: true } }, order: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ payments });
  } catch (error) {
    return handleRouteError(error);
  }
}
