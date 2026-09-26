import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.tldPricing.findMany({ orderBy: { tld: "asc" } });
    return jsonOk({
      pricing: rows.map((row) => ({
        ...row,
        marginCents: row.retailCents - row.wholesaleCents,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = z
      .object({
        id: z.string(),
        retailCents: z.number().int().nonnegative().optional(),
        renewalCents: z.number().int().nonnegative().optional(),
        transferCents: z.number().int().nonnegative().optional(),
        status: z.string().optional(),
      })
      .parse(await request.json());
    const { id, ...data } = body;
    const row = await prisma.tldPricing.update({ where: { id }, data });
    await audit({
      actorId: admin.sub,
      action: "pricing.update",
      entityType: "TldPricing",
      entityId: id,
    });
    return jsonOk({
      pricing: { ...row, marginCents: row.retailCents - row.wholesaleCents },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
