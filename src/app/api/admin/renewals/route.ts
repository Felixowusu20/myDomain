import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const renewals = await prisma.renewal.findMany({
      include: { customer: { include: { user: true } } },
      orderBy: { dueAt: "asc" },
    });
    return jsonOk({ renewals });
  } catch (error) {
    return handleRouteError(error);
  }
}
