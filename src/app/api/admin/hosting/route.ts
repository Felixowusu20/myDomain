import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const accounts = await prisma.hostingAccount.findMany({
      include: {
        customer: { include: { user: true } },
        domain: true,
        plan: true,
        server: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({ accounts });
  } catch (error) {
    return handleRouteError(error);
  }
}
