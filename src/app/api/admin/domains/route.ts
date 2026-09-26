import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const domains = await prisma.domain.findMany({
      include: { customer: { include: { user: true } }, provider: true },
      orderBy: { createdAt: "desc" },
    });
    return jsonOk({
      domains: domains.map((domain) => ({
        id: domain.id,
        name: domain.name,
        customer: domain.customer.user.name,
        status: domain.status,
        provider: domain.provider.name,
        expiration: domain.expiresAt,
        autoRenew: domain.autoRenew,
        createdAt: domain.createdAt,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
