import { z } from "zod";
import { jsonCreated, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

const schema = z.object({
  name: z.string().min(2),
  location: z.string().min(2),
  ipAddress: z.string().min(7),
});

export async function GET() {
  try {
    await requireAdmin();
    const servers = await prisma.server.findMany({
      include: { _count: { select: { accounts: true } } },
      orderBy: { name: "asc" },
    });
    return jsonOk({ servers });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await request.json());
    const server = await prisma.server.create({
      data: {
        name: body.name.toUpperCase(),
        location: body.location,
        ipAddress: body.ipAddress,
        status: "RUNNING",
      },
    });
    await audit({
      actorId: admin.sub,
      action: "server.create",
      entityType: "Server",
      entityId: server.id,
    });
    return jsonCreated({ server });
  } catch (error) {
    return handleRouteError(error);
  }
}
