import { prisma } from "@/lib/db";
import { expireTrialHosting } from "@/lib/services/hosting.service";
import { getNotificationProvider } from "@/lib/providers";
import { isNamecomConfigured } from "@/lib/providers/namecom/config";
import { syncNamecomDomains, syncNamecomTransfers } from "@/lib/providers/namecom/sync";

export async function runBackgroundJobs() {
  const now = new Date();
  const soon = new Date();
  soon.setDate(soon.getDate() + 30);

  const expiring = await prisma.domain.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: soon, gte: now },
    },
    include: { customer: { include: { user: true } } },
  });

  for (const domain of expiring) {
    await getNotificationProvider().send({
      to: domain.customer.user.email,
      event: "domain_expiring",
      title: "Domain renewal approaching",
      body: `${domain.name} expires on ${domain.expiresAt?.toDateString()}.`,
    });
  }

  const expired = await prisma.domain.updateMany({
    where: { status: "ACTIVE", expiresAt: { lt: now } },
    data: { status: "EXPIRED" },
  });

  const trials = await expireTrialHosting();

  let synced = 0;
  if (isNamecomConfigured()) {
    synced = (await syncNamecomDomains().catch(() => ({ synced: 0 }))).synced;
    synced += (await syncNamecomTransfers().catch(() => ({ synced: 0 }))).synced;
  }

  const jobs = ["domain_expiration", "renewal_reminders", "provider_sync", "trial_hosting"];
  for (const name of jobs) {
    const existing = await prisma.backgroundJob.findFirst({ where: { name } });
    if (existing) {
      await prisma.backgroundJob.update({
        where: { id: existing.id },
        data: { status: "RUNNING", lastRunAt: now, lastResult: "ok" },
      });
    } else {
      await prisma.backgroundJob.create({
        data: { name, status: "RUNNING", lastRunAt: now, lastResult: "ok" },
      });
    }
  }

  return {
    expiring: expiring.length,
    expired: expired.count,
    trialsExpired: trials.expired,
    synced,
  };
}

export async function systemHealth() {
  let database: "Healthy" | "Error" = "Healthy";
  try {
    await prisma.user.count();
  } catch {
    database = "Error";
  }

  const providers = await prisma.provider.findMany();
  const jobs = await prisma.backgroundJob.findMany();
  return {
    database,
    providers: providers.map((provider) => ({
      type: provider.type,
      name: provider.name,
      status: provider.status,
      driver: provider.driver,
    })),
    jobs: jobs.map((job) => ({
      name: job.name,
      status: job.status,
      lastRunAt: job.lastRunAt,
    })),
  };
}
