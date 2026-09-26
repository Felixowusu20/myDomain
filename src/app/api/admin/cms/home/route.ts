import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { getAdminHomepageCms } from "@/lib/services/cms.service";
import { safeHttpHref } from "@/lib/security/safe-href";

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk(await getAdminHomepageCms());
  } catch (error) {
    return handleRouteError(error);
  }
}

const homeSchema = z.object({
  eyebrow: z.string().min(1).max(120),
  headline: z.string().min(1).max(120),
  headlineAccent: z.string().max(8).optional(),
  subcopy: z.string().min(1).max(400),
  searchPlaceholder: z.string().min(1).max(80),
  heroImageUrl: z.string().url().or(z.literal("")),
  heroImagePublicId: z.string().optional(),
  heroCaption: z.string().max(160).optional(),
  heroCaptionHref: z.string().max(300).optional(),
  partnersTitle: z.string().min(1).max(160),
  partnersSubcopy: z.string().max(400).optional().default(""),
  stats: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .min(1)
    .max(6),
});

export async function PUT(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = homeSchema.parse(await request.json());
    const heroCaptionHref = safeHttpHref(body.heroCaptionHref);
    const home = await prisma.cmsHome.upsert({
      where: { slug: "home" },
      create: {
        slug: "home",
        ...body,
        headlineAccent: body.headlineAccent ?? ".",
        heroCaption: body.heroCaption ?? "",
        heroCaptionHref,
        heroImagePublicId: body.heroImagePublicId ?? "",
        statsJson: JSON.stringify(body.stats),
      },
      update: {
        eyebrow: body.eyebrow,
        headline: body.headline,
        headlineAccent: body.headlineAccent ?? ".",
        subcopy: body.subcopy,
        searchPlaceholder: body.searchPlaceholder,
        heroImageUrl: body.heroImageUrl,
        heroImagePublicId: body.heroImagePublicId ?? "",
        heroCaption: body.heroCaption ?? "",
        heroCaptionHref,
        partnersTitle: body.partnersTitle,
        partnersSubcopy: body.partnersSubcopy,
        statsJson: JSON.stringify(body.stats),
      },
    });
    await audit({
      actorId: admin.sub,
      action: "cms.home.update",
      entityType: "CmsHome",
      entityId: home.id,
    });
    return jsonOk({ home });
  } catch (error) {
    return handleRouteError(error);
  }
}
