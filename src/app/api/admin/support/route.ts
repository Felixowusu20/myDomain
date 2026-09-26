import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const tickets = await prisma.supportTicket.findMany({
      include: { customer: { include: { user: true } } },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ tickets });
  } catch (error) {
    return handleRouteError(error);
  }
}
