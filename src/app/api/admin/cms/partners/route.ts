import { z } from "zod";
import { jsonCreated, jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { safeHttpHref } from "@/lib/security/safe-href";

const schema = z.object({
  id: z.string().optional(),
  tag: z.string().min(1).max(80),
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(320),
  imageUrl: z.string().url(),
  imagePublicId: z.string().optional(),
  href: z.string().max(300).optional(),
  comingSoon: z.boolean().optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await request.json());
    const href = safeHttpHref(body.href);
    const card = await prisma.cmsPartnerCard.create({
      data: {
        tag: body.tag,
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        imagePublicId: body.imagePublicId ?? "",
        href,
        comingSoon: body.comingSoon ?? true,
        active: body.active ?? true,
        sortOrder: body.sortOrder ?? 99,
      },
    });
    await audit({
      actorId: admin.sub,
      action: "cms.partner.create",
      entityType: "CmsPartnerCard",
      entityId: card.id,
    });
    return jsonCreated({ card });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.extend({ id: z.string() }).parse(await request.json());
    const href = safeHttpHref(body.href);
    const card = await prisma.cmsPartnerCard.update({
      where: { id: body.id },
      data: {
        tag: body.tag,
        title: body.title,
        description: body.description,
        imageUrl: body.imageUrl,
        imagePublicId: body.imagePublicId ?? "",
        href,
        comingSoon: body.comingSoon ?? true,
        active: body.active ?? true,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    await audit({
      actorId: admin.sub,
      action: "cms.partner.update",
      entityType: "CmsPartnerCard",
      entityId: card.id,
    });
    return jsonOk({ card });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return jsonError("Missing partner id.", 400);
    await prisma.cmsPartnerCard.delete({ where: { id } });
    await audit({
      actorId: admin.sub,
      action: "cms.partner.delete",
      entityType: "CmsPartnerCard",
      entityId: id,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
