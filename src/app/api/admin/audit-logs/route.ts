import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const logs = await prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return jsonOk({
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        actor: log.actor?.email ?? "system",
        createdAt: log.createdAt,
        metadata: log.metadata,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
