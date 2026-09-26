export async function seedCatalog(prisma: {
  hostingPlan: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
  server: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
  provider: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
  backgroundJob: { create: (args: { data: Record<string, unknown> }) => Promise<unknown> };
}) {
  const now = new Date();

  await prisma.hostingPlan.create({
    data: {
      slug: "starter",
      name: "Starter",
      yearlyCents: 6000,
      websites: 1,
      storageGb: 10,
      bandwidthGb: 100,
      databases: 1,
      sslIncluded: true,
      description: "1 website · 10 GB storage · 100 GB bandwidth · 1 database · Free SSL",
      sortOrder: 1,
      active: true,
    },
  });
  await prisma.hostingPlan.create({
    data: {
      slug: "business",
      name: "Business",
      yearlyCents: 12000,
      websites: 5,
      storageGb: 50,
      bandwidthGb: 500,
      databases: 10,
      sslIncluded: true,
      description: "5 websites · 50 GB storage · 500 GB bandwidth · 10 databases · Free SSL",
      sortOrder: 2,
      active: true,
    },
  });
  await prisma.hostingPlan.create({
    data: {
      slug: "pro",
      name: "Pro",
      yearlyCents: 25000,
      websites: -1,
      storageGb: 100,
      bandwidthGb: 1000,
      databases: -1,
      sslIncluded: true,
      description: "Unlimited websites · 100 GB storage · 1 TB bandwidth · Unlimited databases · Free SSL",
      sortOrder: 3,
      active: true,
    },
  });

  const providers = [
    { type: "DOMAIN", name: "name.com", slug: "namecom-domain", driver: "namecom", status: "CONNECTED" as const },
    { type: "HOSTING", name: "Not connected yet", slug: "hosting", driver: "none", status: "DISCONNECTED" as const },
    { type: "DNS", name: "name.com", slug: "namecom-dns", driver: "namecom", status: "CONNECTED" as const },
    { type: "PAYMENT", name: "Free test mode (mock)", slug: "payment", driver: "mock", status: "CONNECTED" as const },
    { type: "NOTIFICATION", name: "SMTP", slug: "smtp-notification", driver: "smtp", status: "CONNECTED" as const },
  ] as const;

  for (const provider of providers) {
    await prisma.provider.create({
      data: {
        type: provider.type,
        name: provider.name,
        slug: provider.slug,
        driver: provider.driver,
        status: provider.status,
        lastChecked: now,
        configJson: "{}",
      },
    });
  }

  for (const name of ["domain_expiration", "renewal_reminders", "provider_sync"]) {
    await prisma.backgroundJob.create({
      data: { name, status: "IDLE", lastRunAt: null, lastResult: null },
    });
  }
}
