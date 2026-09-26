import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Github, MapPin, Server, Wifi } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { Meter, StatusBadge } from "@/components/status-badge";
import { ConnectDomainForm } from "@/components/connect-domain-form";
import { SiteProjectForm } from "@/components/site-project-form";
import { TrialHostingBanner } from "@/components/trial-hosting-banner";
import { PageHeader, SectionTitle } from "@/components/ui";
import { DeployLogConsole } from "@/components/deploy-log-console";
import { publicEnvKeys } from "@/lib/services/hosting.service";
import { formatDate } from "@/lib/utils";
import { DeploymentLiveCard } from "@/components/deployment-live-card";

export default async function HostingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { customerId } = await getCustomerContext();
  const { id } = await params;
  const [account, domains] = await Promise.all([
    prisma.hostingAccount.findFirst({
      where: { id, customerId },
      include: {
        plan: true,
        server: true,
        domain: true,
        deployments: { orderBy: { createdAt: "desc" }, take: 8 },
      },
    }),
    prisma.domain.findMany({ where: { customerId } }),
  ]);
  if (!account) notFound();
  const envKeys = publicEnvKeys(account.envVarsJson);
  const preview = account.isTrial || account.server.name === "Preview";
  const latestDeploy = account.deployments[0];

  return (
    <div className="space-y-5">
      <Link href="/sites" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
        <ArrowLeft className="h-4 w-4" />
        All sites
      </Link>
      <PageHeader
        kicker={account.isTrial ? "Preview hosting" : "Server status"}
        title={account.githubRepo ?? account.plan.name}
        description={
          account.isTrial
            ? "Live preview for your GitHub project — static sites and SSR apps with databases. Buy a plan within two weeks to keep it live."
            : `${account.server.name} · ${account.server.location}`
        }
        actions={
          <span className="flex items-center gap-2">
            {account.isTrial ? <StatusBadge status="TRIAL" /> : null}
            <StatusBadge status={account.deployStatus === "LIVE" ? "LIVE" : account.deployStatus === "BUILDING" ? "BUILDING" : account.status} />
          </span>
        }
      />
      {account.isTrial ? (
        <TrialHostingBanner
          hostingId={account.id}
          trialEndsAt={account.trialEndsAt}
          hasDomain={Boolean(account.domain)}
          hasDomains={domains.length > 0}
        />
      ) : null}
      {account.previewUrl ? (
        <DeploymentLiveCard
          account={{
            ...account,
            domainName: account.domain?.name,
            hasDomains: domains.length > 0,
          }}
        />
      ) : account.lastDeployLog ? (
        <div className="space-y-3">
          <DeployLogConsole log={account.lastDeployLog} status={account.deployStatus} title="Build output" />
        </div>
      ) : null}
      <section className="card space-y-4 p-5">
        <SectionTitle icon={Github} title="GitHub project & env" />
        <SiteProjectForm
          hostingId={account.id}
          githubRepo={account.githubRepo ?? ""}
          githubBranch={account.githubBranch}
          envKeys={envKeys}
          deployLabel={account.deployStatus === "FAILED" ? "Redeploy" : account.deployStatus === "LIVE" ? "Redeploy" : "Deploy"}
        />
      </section>
      {!preview ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Info icon={Server} label="Server" value={account.server.name} />
            <Info icon={MapPin} label="Location" value={account.server.location} />
            <Info icon={Wifi} label="IP" value={account.server.ipAddress} />
            <Info icon={Server} label="Uptime" value={`${account.server.uptimePercent}%`} />
          </div>
          <section className="card p-5">
            <SectionTitle icon={Server} title="Resource usage" />
            <div className="grid gap-4 md:grid-cols-2">
              <Meter label="CPU" value={account.server.cpuPercent} />
              <Meter label="RAM" value={account.server.ramPercent} />
              <Meter label="Storage" value={account.server.diskPercent} />
              <Meter label="Bandwidth" value={account.server.bandwidthPercent} />
            </div>
          </section>
        </>
      ) : null}
      <section id="connect-domain" className="card scroll-mt-6 p-5">
        <SectionTitle title="Connect domain" />
        {account.domain ? (
          <p className="font-semibold text-[var(--success)]">
            Connected · {account.domain.name} · {account.plan.name}
          </p>
        ) : (
          <ConnectDomainForm hostingId={account.id} domains={domains.map((d) => ({ id: d.id, name: d.name }))} />
        )}
      </section>
      {account.deployments.length ? (
        <section className="card space-y-4 p-5">
          <SectionTitle title="Deploy history" />
          <div className="space-y-2">
            {account.deployments.map((deploy) => (
              <div
                key={deploy.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--navy)]">
                    {deploy.githubRepo}@{deploy.githubBranch}
                  </p>
                  <p className="text-sm text-[var(--muted)]">{formatDate(deploy.createdAt)}</p>
                </div>
                <StatusBadge status={deploy.status} />
              </div>
            ))}
          </div>
          {latestDeploy?.log && account.deployStatus !== "BUILDING" && !account.previewUrl ? (
            <DeployLogConsole log={latestDeploy.log} status={latestDeploy.status} title="Latest deploy log" compact />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Server;
  label: string;
  value: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-2 font-semibold">{value}</p>
    </div>
  );
}
