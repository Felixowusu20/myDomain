import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["RUNNING", "WARNING", "OFFLINE", "MAINTENANCE"]).optional(),
  location: z.string().optional(),
  ipAddress: z.string().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const server = await prisma.server.findUnique({
      where: { id },
      include: { accounts: { include: { customer: { include: { user: true } }, plan: true } } },
    });
    if (!server) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ server });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const server = await prisma.server.update({ where: { id }, data: body });
    await audit({
      actorId: admin.sub,
      action: "server.update",
      entityType: "Server",
      entityId: id,
      metadata: body,
    });
    return jsonOk({ server });
  } catch (error) {
    return handleRouteError(error);
  }
}
