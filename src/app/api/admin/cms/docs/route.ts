import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { SMS_DOCS_PRODUCT } from "@/lib/seed-sms-docs";

const updateSchema = z.object({
  id: z.string().min(1, "Choose a section to save."),
  title: z.string().trim().min(2, "Title must be at least 2 characters.").max(120),
  summary: z.string().trim().max(200).optional().default(""),
  body: z.string().trim().min(1, "Write the section before saving.").max(20000),
  sortOrder: z.number().int().min(0).max(9999),
  published: z.boolean(),
});

function slugify(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "section";
}

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = updateSchema.parse(await request.json());
    const existing = await prisma.cmsDocPage.findFirst({
      where: { id: body.id, product: SMS_DOCS_PRODUCT },
    });
    if (!existing) return jsonError("That section was not found.", 404);
    const page = await prisma.cmsDocPage.update({
      where: { id: existing.id },
      data: {
        title: body.title,
        summary: body.summary,
        body: body.body,
        sortOrder: body.sortOrder,
        published: body.published,
      },
    });
    await audit({
      actorId: admin.sub,
      action: "cms.docs.update",
      entityType: "CmsDocPage",
      entityId: page.id,
      metadata: { slug: page.slug },
    });
    return jsonOk({ page });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = z.object({ title: z.string().trim().min(2).max(120) }).parse(await request.json());
    const base = slugify(body.title);
    let slug = base;
    let suffix = 2;
    while (await prisma.cmsDocPage.findUnique({ where: { product_slug: { product: SMS_DOCS_PRODUCT, slug } } })) {
      slug = `${base.slice(0, 50)}-${suffix}`;
      suffix += 1;
    }
    const last = await prisma.cmsDocPage.findFirst({
      where: { product: SMS_DOCS_PRODUCT },
      orderBy: { sortOrder: "desc" },
    });
    const page = await prisma.cmsDocPage.create({
      data: {
        product: SMS_DOCS_PRODUCT,
        slug,
        title: body.title,
        summary: "",
        body: "Write this section here.",
        sortOrder: (last?.sortOrder ?? 0) + 10,
        published: false,
      },
    });
    await audit({
      actorId: admin.sub,
      action: "cms.docs.create",
      entityType: "CmsDocPage",
      entityId: page.id,
      metadata: { slug: page.slug },
    });
    return jsonOk({ page });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) return jsonError("Choose a section to remove.", 400);
    const existing = await prisma.cmsDocPage.findFirst({
      where: { id, product: SMS_DOCS_PRODUCT },
    });
    if (!existing) return jsonError("That section was not found.", 404);
    await prisma.cmsDocPage.delete({ where: { id: existing.id } });
    await audit({
      actorId: admin.sub,
      action: "cms.docs.delete",
      entityType: "CmsDocPage",
      entityId: existing.id,
      metadata: { slug: existing.slug },
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
