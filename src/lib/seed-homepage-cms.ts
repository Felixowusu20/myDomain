export const DEFAULT_HOME_STATS = [
  { value: "Live", label: "name.com pricing" },
  { value: "600+", label: "domain extensions" },
  { value: "24/7", label: "dashboard access" },
  { value: "DNS", label: "point anywhere" },
];

export const DEFAULT_PARTNER_CARDS = [
  {
    tag: "Coming soon",
    title: "Workspace",
    description: "Business email and docs for your brand — partner integration on the way.",
    imageUrl:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80",
    comingSoon: true,
    sortOrder: 1,
  },
  {
    tag: "Coming soon",
    title: "Website builder",
    description: "Launch a site on your new domain without touching code.",
    imageUrl:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80",
    comingSoon: true,
    sortOrder: 2,
  },
  {
    tag: "Coming soon",
    title: "Business email",
    description: "Professional inboxes on your domain when the partner goes live.",
    imageUrl:
      "https://images.unsplash.com/photo-1596526131083-e8c633c948d2?auto=format&fit=crop&w=900&q=80",
    comingSoon: true,
    sortOrder: 3,
  },
  {
    tag: "Coming soon",
    title: "WordPress",
    description: "Point your domain at WordPress hosting when we flip the switch.",
    imageUrl:
      "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=900&q=80",
    comingSoon: true,
    sortOrder: 4,
  },
];

export const DEFAULT_HOME = {
  slug: "home",
  eyebrow: "Domains built for entrepreneurs",
  headline: "Bet on yourself",
  headlineAccent: ".",
  subcopy: "You've got the vision. Start with a domain that means business.",
  searchPlaceholder: "Find my domain.",
  heroImageUrl:
    "https://images.unsplash.com/photo-1556157382-97eda2d62296?auto=format&fit=crop&w=1400&q=80",
  heroImagePublicId: "",
  heroCaption: "",
  heroCaptionHref: "",
  statsJson: JSON.stringify(DEFAULT_HOME_STATS),
  partnersTitle: "The one-stop shop to launch your business",
  partnersSubcopy: "",
};

type CmsClient = {
  cmsHome: {
    upsert: (args: {
      where: { slug: string };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => Promise<unknown>;
  };
  cmsPartnerCard: {
    count: () => Promise<number>;
    create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  };
};

export async function seedHomepageCms(prisma: CmsClient) {
  await prisma.cmsHome.upsert({
    where: { slug: "home" },
    create: { ...DEFAULT_HOME },
    update: {},
  });
  const cardCount = await prisma.cmsPartnerCard.count();
  if (cardCount === 0) {
    for (const card of DEFAULT_PARTNER_CARDS) {
      await prisma.cmsPartnerCard.create({
        data: {
          ...card,
          imagePublicId: "",
          href: "",
          active: true,
        },
      });
    }
  }
}
