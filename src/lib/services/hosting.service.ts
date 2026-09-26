import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import { getHostingProvider, getDnsProvider, getNotificationProvider } from "@/lib/providers";
import { audit } from "@/lib/audit";
import { inspectGithubRepo } from "@/lib/services/github.service";
import { removeDeploymentArtifacts, stopDeploymentContainer, stopRuntimeContainer, runContainerBuild } from "@/lib/workers/container-build";
import { frameworkRuntime } from "@/lib/runtime/presets";
import { buildPreviewUrl } from "@/lib/runtime/preview-url";

function addYear(date = new Date()) {
  const next = new Date(date);
  next.setFullYear(next.getFullYear() + 1);
  return next;
}

export async function listPlans() {
  return prisma.hostingPlan.findMany({
    where: { active: true, slug: { not: "trial" } },
    orderBy: { sortOrder: "asc" },
  });
}

export async function listCustomerHosting(customerId: string) {
  return prisma.hostingAccount.findMany({
    where: { customerId },
    include: { plan: true, server: true, domain: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerHosting(customerId: string, id: string) {
  return prisma.hostingAccount.findFirst({
    where: { id, customerId },
    include: {
      plan: true,
      server: true,
      domain: true,
      deployments: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
}

export async function purchaseHosting(input: {
  customerId: string;
  planSlug: string;
  hostingId?: string;
  actorId?: string;
}) {
  const plan = await prisma.hostingPlan.findUnique({ where: { slug: input.planSlug } });
  if (!plan || plan.slug === "trial") throw new Error("Plan not found");
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: { user: true },
  });
  if (!customer) throw new Error("Customer not found");

  const trialWhere = {
    customerId: input.customerId,
    isTrial: true,
    status: { notIn: ["TERMINATED" as const] },
  };
  const trial = input.hostingId
    ? await prisma.hostingAccount.findFirst({ where: { id: input.hostingId, ...trialWhere } })
    : await prisma.hostingAccount.findFirst({ where: trialWhere, orderBy: { createdAt: "desc" } });

  const paidServer = await prisma.server.findFirst({
    where: { status: "RUNNING", name: { not: "Preview" } },
    orderBy: { cpuPercent: "asc" },
  });
  const server =
    paidServer ??
    (trial ? await prisma.server.findUnique({ where: { id: trial.serverId } }) : null);
  if (!server) throw new Error("No servers available. Add one in admin before selling paid hosting.");

  const account = trial
    ? await prisma.hostingAccount.update({
        where: { id: trial.id },
        data: {
          planId: plan.id,
          serverId: server.id,
          status: "RUNNING",
          isTrial: false,
          trialEndsAt: null,
          deployStatus: trial.deployStatus === "LIVE" ? "LIVE" : trial.deployStatus,
          renewsAt: addYear(),
        },
        include: { plan: true, server: true, domain: true },
      })
    : await (async () => {
        const provisioned = await getHostingProvider().createHostingAccount({
          planSlug: plan.slug,
          customerEmail: customer.user.email,
        });
        return prisma.hostingAccount.create({
          data: {
            customerId: input.customerId,
            planId: plan.id,
            serverId: server.id,
            status: "RUNNING",
            username: provisioned.username,
            passwordMock: provisioned.password,
            providerRef: provisioned.providerRef,
            renewsAt: addYear(),
          },
          include: { plan: true, server: true, domain: true },
        });
      })();

  await prisma.subscription.create({
    data: {
      customerId: input.customerId,
      type: "HOSTING",
      resourceId: account.id,
      label: plan.name,
      renewsAt: account.renewsAt,
      amountCents: plan.yearlyCents,
    },
  });
  await prisma.renewal.create({
    data: {
      customerId: input.customerId,
      resourceType: "HOSTING",
      resourceId: account.id,
      label: plan.name,
      dueAt: account.renewsAt,
      amountCents: plan.yearlyCents,
    },
  });
  await getNotificationProvider().send({
    to: customer.user.email,
    event: "hosting_created",
    title: "Hosting ready",
    body: `${plan.name} is now active.`,
  });
  await prisma.notification.create({
    data: {
      customerId: input.customerId,
      event: "hosting_created",
      title: "Hosting ready",
      body: `${plan.name} is now active.`,
    },
  });
  await audit({
    actorId: input.actorId,
    action: "hosting.purchase",
    entityType: "HostingAccount",
    entityId: account.id,
    metadata: { plan: plan.slug },
  });
  return account;
}

export async function connectDomainToHosting(input: {
  customerId: string;
  hostingId: string;
  domainId: string;
}) {
  const hosting = await prisma.hostingAccount.findFirst({
    where: { id: input.hostingId, customerId: input.customerId },
    include: { server: true, plan: true },
  });
  const domain = await prisma.domain.findFirst({
    where: { id: input.domainId, customerId: input.customerId },
  });
  if (!hosting || !domain) return null;
  if (hosting.isTrial && hosting.trialEndsAt && hosting.trialEndsAt.getTime() < Date.now()) {
    throw new Error("This preview has ended. Buy a hosting plan to connect a domain.");
  }

  const aRecord = await prisma.dnsRecord.findFirst({
    where: { domainId: domain.id, type: "A", host: "@" },
  });
  if (aRecord) {
    await prisma.dnsRecord.update({
      where: { id: aRecord.id },
      data: { value: hosting.server.ipAddress },
    });
    await getDnsProvider().updateDnsRecord(domain.name, aRecord.id, {
      type: "A",
      host: "@",
      value: hosting.server.ipAddress,
    });
  } else {
    await prisma.dnsRecord.create({
      data: {
        domainId: domain.id,
        type: "A",
        host: "@",
        value: hosting.server.ipAddress,
      },
    });
    await getDnsProvider().createDnsRecord(domain.name, {
      type: "A",
      host: "@",
      value: hosting.server.ipAddress,
    });
  }

  return prisma.hostingAccount.update({
    where: { id: hosting.id },
    data: { domainId: domain.id, status: "RUNNING" },
    include: { plan: true, server: true, domain: true },
  });
}

export async function adminSetHostingStatus(
  id: string,
  status: "SUSPENDED" | "RUNNING" | "TERMINATED",
  actorId?: string,
) {
  const account = await prisma.hostingAccount.findUnique({ where: { id } });
  if (!account?.providerRef) return null;
  const provider = getHostingProvider();
  if (status === "SUSPENDED") {
    await provider.suspendHostingAccount(account.providerRef);
    if (account.previewSlug) await stopRuntimeContainer(account.previewSlug);
  }
  if (status === "RUNNING") await provider.unsuspendHostingAccount(account.providerRef);
  if (status === "TERMINATED") {
    await provider.terminateHostingAccount(account.providerRef);
    if (account.previewSlug) await stopRuntimeContainer(account.previewSlug);
  }
  const updated = await prisma.hostingAccount.update({
    where: { id },
    data: {
      status,
      ...(status === "SUSPENDED" || status === "TERMINATED"
        ? { runtimePort: null, runtimeContainer: null, deployStatus: status === "TERMINATED" ? "IDLE" : account.deployStatus }
        : {}),
    },
  });
  await audit({
    actorId,
    action: `hosting.${status.toLowerCase()}`,
    entityType: "HostingAccount",
    entityId: id,
  });
  return updated;
}

export const TRIAL_DAYS = 14;

export type EnvVar = { key: string; value: string };

export function parseGithubRepo(input: string) {
  const raw = input.trim().replace(/\/+$/, "");
  const fromUrl = raw.match(/github\.com[:/]([^/]+)\/([^/#?]+)/i);
  const compact = raw.match(/^([\w.-]+)\/([\w.-]+)$/);
  const owner = fromUrl?.[1] ?? compact?.[1];
  const repo = (fromUrl?.[2] ?? compact?.[2])?.replace(/\.git$/i, "");
  if (!owner || !repo) throw new Error("Enter a GitHub repo like owner/repo");
  return `${owner}/${repo}`;
}

export function parseEnvVars(raw: unknown): EnvVar[] {
  if (!Array.isArray(raw)) return [];
  const rows: EnvVar[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const key = String((item as { key?: string }).key ?? "").trim();
    const value = String((item as { value?: string }).value ?? "");
    if (!key || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    rows.push({ key, value });
    if (rows.length >= 50) break;
  }
  return rows;
}

function addDays(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next;
}

async function ensureTrialInfra() {
  const plan =
    (await prisma.hostingPlan.findUnique({ where: { slug: "trial" } })) ??
    (await prisma.hostingPlan.create({
      data: {
        slug: "trial",
        name: "Preview",
        yearlyCents: 0,
        websites: 1,
        storageGb: 1,
        bandwidthGb: 10,
        databases: 1,
        sslIncluded: true,
        description: "14-day preview hosting for GitHub projects (static + SSR)",
        sortOrder: 99,
        active: false,
      },
    }));
  const server =
    (await prisma.server.findUnique({ where: { name: "Preview" } })) ??
    (await prisma.server.create({
      data: {
        name: "Preview",
        location: "Trial cluster",
        ipAddress: "preview.local",
        status: "RUNNING",
        cpuPercent: 0,
        ramPercent: 0,
        diskPercent: 0,
        bandwidthPercent: 0,
        uptimePercent: 100,
      },
    }));
  return { plan, server };
}

function mergeEnvVars(existingJson: string, incoming: EnvVar[]) {
  const current = parseEnvVars(JSON.parse(existingJson || "[]"));
  const byKey = new Map(current.map((row) => [row.key, row.value]));
  for (const row of incoming) {
    if (row.value === "" && byKey.has(row.key)) continue;
    byKey.set(row.key, row.value);
  }
  return [...byKey.entries()].map(([key, value]) => ({ key, value }));
}

export function publicEnvKeys(envVarsJson: string) {
  return parseEnvVars(JSON.parse(envVarsJson || "[]")).map((row) => row.key);
}

export function trialDaysLeft(trialEndsAt: Date | null | undefined) {
  if (!trialEndsAt) return 0;
  return Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / 86_400_000));
}

export function publicHosting<T extends { envVarsJson: string; passwordMock?: string | null }>(account: T) {
  const { envVarsJson, passwordMock: _password, ...rest } = account;
  return { ...rest, envKeys: publicEnvKeys(envVarsJson) };
}

export async function startGithubTrialDeploy(input: {
  customerId: string;
  userId: string;
  githubRepo: string;
  githubBranch?: string;
  rootDirectory?: string;
  envVars?: unknown;
  actorId?: string;
}) {
  const repo = parseGithubRepo(input.githubRepo);
  const branch = (input.githubBranch ?? "main").trim() || "main";
  const rootDirectory = (input.rootDirectory ?? "").replace(/^\/+|\/+$/g, "");
  const envVars = parseEnvVars(input.envVars);
  const inspection = await inspectGithubRepo({
    userId: input.userId,
    repo,
    branch,
    rootDirectory,
    envKeys: envVars.map((row) => row.key),
  });
  if (!inspection.canDeploy) {
    throw new Error(`Deploy checks failed. ${inspection.summary}`);
  }
  const { plan, server } = await ensureTrialInfra();
  const slug = `p${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const runtime = frameworkRuntime(inspection.framework.name);
  const runtimeMode = inspection.framework.runtimeMode || runtime.mode;
  const startCommand = inspection.framework.startCommand || runtime.startCommand;
  const previewUrl = buildPreviewUrl({
    slug,
    runtimeMode,
  });
  const now = new Date();
  const trialEndsAt = addDays(TRIAL_DAYS);
  const log = [
    `Repository checked: ${repo}@${branch}.`,
    `Detected framework: ${inspection.framework.name}.`,
    `Runtime mode: ${runtimeMode}${runtimeMode === "server" ? " (SSR / API / database-ready)" : " (static files)"}.`,
    `Build check: ${inspection.framework.buildCommand || "No build command"}.`,
    `Output directory: ${inspection.framework.outputDirectory}.`,
    `${inspection.summary}.`,
    "Queued isolated build...",
  ].join("\n");

  const account = await prisma.hostingAccount.create({
    data: {
      customerId: input.customerId,
      planId: plan.id,
      serverId: server.id,
      status: "RUNNING",
      username: `gh-${slug}`,
      passwordMock: "trial",
      providerRef: `trial-${slug}`,
      isTrial: true,
      trialEndsAt,
      githubRepo: repo,
      githubBranch: branch,
      framework: inspection.framework.name,
      rootDirectory,
      buildCommand: inspection.framework.buildCommand || null,
      startCommand: startCommand || null,
      runtimeMode,
      envVarsJson: JSON.stringify(envVars),
      previewSlug: slug,
      previewUrl,
      deployStatus: "BUILDING",
      lastDeployAt: now,
      lastDeployLog: log,
      renewsAt: trialEndsAt,
    },
    include: { plan: true, server: true, domain: true },
  });

  const deployment = await prisma.hostingDeployment.create({
    data: {
      hostingId: account.id,
      githubRepo: repo,
      githubBranch: branch,
      status: "BUILDING",
      previewUrl,
      log: account.lastDeployLog,
    },
  });
  void runContainerBuild({ hostingId: account.id, deploymentId: deployment.id, userId: input.userId }).catch((error) => {
    console.error("Background GitHub deployment failed", error);
  });
  await audit({
    actorId: input.actorId,
    action: "hosting.trial_deploy",
    entityType: "HostingAccount",
    entityId: account.id,
    metadata: { repo, branch },
  });
  return account;
}

export async function updateHostingProject(input: {
  customerId: string;
  hostingId: string;
  githubRepo?: string;
  githubBranch?: string;
  envVars?: unknown;
}) {
  const account = await prisma.hostingAccount.findFirst({
    where: { id: input.hostingId, customerId: input.customerId },
  });
  if (!account) return null;
  const data: {
    githubRepo?: string;
    githubBranch?: string;
    envVarsJson?: string;
  } = {};
  if (input.githubRepo) data.githubRepo = parseGithubRepo(input.githubRepo);
  if (input.githubBranch) data.githubBranch = input.githubBranch.trim() || "main";
  if (input.envVars) data.envVarsJson = JSON.stringify(mergeEnvVars(account.envVarsJson, parseEnvVars(input.envVars)));
  return prisma.hostingAccount.update({
    where: { id: account.id },
    data,
    include: { plan: true, server: true, domain: true },
  });
}

export async function deleteHostingProject(input: {
  customerId: string;
  hostingId: string;
  actorId?: string;
}) {
  const account = await prisma.hostingAccount.findFirst({
    where: { id: input.hostingId, customerId: input.customerId },
  });
  if (!account) return null;

  await removeDeploymentArtifacts(account.previewSlug ?? account.id);
  if (account.previewSlug) await stopRuntimeContainer(account.previewSlug);
  const latestDeployment = await prisma.hostingDeployment.findFirst({
    where: { hostingId: account.id, status: "BUILDING" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (latestDeployment) await stopDeploymentContainer(latestDeployment.id);

  if (account.providerRef && !account.isTrial) {
    await getHostingProvider().terminateHostingAccount(account.providerRef);
  }

  await prisma.$transaction([
    prisma.hostingDeployment.deleteMany({ where: { hostingId: account.id } }),
    prisma.subscription.deleteMany({ where: { resourceId: account.id, type: "HOSTING" } }),
    prisma.renewal.deleteMany({ where: { resourceId: account.id, resourceType: "HOSTING" } }),
    prisma.hostingAccount.delete({ where: { id: account.id } }),
  ]);
  await audit({
    actorId: input.actorId,
    action: "hosting.delete",
    entityType: "HostingAccount",
    entityId: account.id,
    metadata: { githubRepo: account.githubRepo, isTrial: account.isTrial },
  });
  return account;
}

export async function redeployHosting(input: { customerId: string; hostingId: string; actorId?: string; userId?: string }) {
  const account = await prisma.hostingAccount.findFirst({
    where: { id: input.hostingId, customerId: input.customerId },
  });
  if (!account?.githubRepo) throw new Error("Connect a GitHub repo first.");
  if (account.deployStatus === "BUILDING") {
    throw new Error("A deploy is already running. Wait for it to finish, then try again.");
  }
  if (account.isTrial && account.trialEndsAt && account.trialEndsAt.getTime() < Date.now()) {
    throw new Error("This preview has ended. Buy a hosting plan to deploy again.");
  }

  const slug = account.previewSlug ?? account.id.slice(0, 10);
  const runtime = frameworkRuntime(account.framework);
  const runtimeMode = account.runtimeMode === "server" || runtime.mode === "server" ? "server" : "static";
  const previewUrl = buildPreviewUrl({
    slug,
    runtimeMode,
    runtimePort: account.runtimePort,
  });

  let frameworkName = account.framework ?? "Other";
  let buildCommand = account.buildCommand;
  let startCommand = (account.startCommand ?? runtime.startCommand) || null;
  let log = `Redeploy queued for ${account.githubRepo}@${account.githubBranch}.`;

  if (input.userId) {
    const inspection = await inspectGithubRepo({
      userId: input.userId,
      repo: account.githubRepo,
      branch: account.githubBranch,
      rootDirectory: account.rootDirectory,
      envKeys: publicEnvKeys(account.envVarsJson),
    });
    if (!inspection.canDeploy) {
      throw new Error(`Deploy checks failed. ${inspection.summary}`);
    }
    frameworkName = inspection.framework.name;
    buildCommand = inspection.framework.buildCommand || null;
    startCommand = (inspection.framework.startCommand || frameworkRuntime(frameworkName).startCommand) || null;
    log += `\nDetected framework: ${frameworkName}.`;
    log += `\nRuntime mode: ${inspection.framework.runtimeMode}.`;
    log += `\nBuild check: ${buildCommand || "No build command"}.`;
    log += `\n${inspection.summary}.`;
  }

  log += `\nStarting isolated build...`;

  const deployment = await prisma.hostingDeployment.create({
    data: {
      hostingId: account.id,
      githubRepo: account.githubRepo,
      githubBranch: account.githubBranch,
      status: "BUILDING",
      previewUrl,
      log,
    },
  });

  const updated = await prisma.hostingAccount.update({
    where: { id: account.id },
    data: {
      status: "RUNNING",
      previewSlug: slug,
      previewUrl,
      framework: frameworkName,
      buildCommand,
      startCommand,
      runtimeMode: startCommand ? "server" : "static",
      deployStatus: "BUILDING",
      lastDeployAt: new Date(),
      lastDeployLog: log,
    },
    include: { plan: true, server: true, domain: true },
  });

  void runContainerBuild({
    hostingId: account.id,
    deploymentId: deployment.id,
    userId: input.userId ?? "",
  }).catch((error) => {
    console.error("Background redeploy failed", error);
  });

  await audit({
    actorId: input.actorId,
    action: "hosting.redeploy",
    entityType: "HostingAccount",
    entityId: account.id,
    metadata: { repo: account.githubRepo, branch: account.githubBranch },
  });

  return updated;
}

export async function expireTrialHosting() {
  const now = new Date();
  const due = await prisma.hostingAccount.findMany({
    where: {
      isTrial: true,
      status: { notIn: ["SUSPENDED", "TERMINATED"] },
      trialEndsAt: { lte: now },
    },
    include: { customer: { include: { user: true } } },
  });
  for (const account of due) {
    if (account.previewSlug) await stopRuntimeContainer(account.previewSlug);
    await prisma.hostingAccount.update({
      where: { id: account.id },
      data: {
        status: "SUSPENDED",
        deployStatus: "IDLE",
        runtimePort: null,
        runtimeContainer: null,
      },
    });
    await prisma.notification.create({
      data: {
        customerId: account.customerId,
        event: "trial_ended",
        title: "Preview hosting ended",
        body: "Buy a hosting plan and connect your domain to keep this GitHub project live.",
      },
    });
    await getNotificationProvider().send({
      to: account.customer.user.email,
      event: "trial_ended",
      title: "Preview hosting ended",
      body: "Your 14-day preview ended. Buy hosting and connect your domain to keep the site live.",
    });
  }
  return { expired: due.length };
}

export async function getPublicPreview(slug: string) {
  return prisma.hostingAccount.findFirst({
    where: { previewSlug: slug },
    include: {
      domain: true,
      plan: true,
      customer: { select: { userId: true } },
    },
  });
}
