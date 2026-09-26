import { prisma } from "@/lib/db";
import { parseJson } from "@/lib/utils";
import { DEFAULT_HOME, DEFAULT_HOME_STATS, seedHomepageCms } from "@/lib/seed-homepage-cms";

export type HomeStat = { value: string; label: string };

export async function ensureHomepageCms() {
  await seedHomepageCms(prisma as never);
}

export async function getHomepageCms() {
  await ensureHomepageCms();
  const home = await prisma.cmsHome.findUnique({ where: { slug: "home" } });
  const partners = await prisma.cmsPartnerCard.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return {
    home: home ?? DEFAULT_HOME,
    stats: parseJson<HomeStat[]>(home?.statsJson ?? "[]", DEFAULT_HOME_STATS),
    partners,
  };
}

export async function getAdminHomepageCms() {
  await ensureHomepageCms();
  const home = await prisma.cmsHome.findUniqueOrThrow({ where: { slug: "home" } });
  const partners = await prisma.cmsPartnerCard.findMany({ orderBy: { sortOrder: "asc" } });
  return {
    home,
    stats: parseJson<HomeStat[]>(home.statsJson, DEFAULT_HOME_STATS),
    partners,
  };
}
