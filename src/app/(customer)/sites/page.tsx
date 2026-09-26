import Link from "next/link";
import { ArrowUpRight, Clock3, ExternalLink, Github, Rocket, Server } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { GithubRepoPicker } from "@/components/github-repo-picker";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, SectionTitle } from "@/components/ui";
import { isGithubConfigured } from "@/lib/github/config";
import { getGithubConnection } from "@/lib/services/github.service";
import { publicEnvKeys, trialDaysLeft } from "@/lib/services/hosting.service";
import { formatDate } from "@/lib/utils";

export default async function SitesPage() {
  const { customerId, user } = await getCustomerContext();
  const [accounts, github] = await Promise.all([
    prisma.hostingAccount.findMany({
      where: { customerId },
      include: { domain: true, plan: true },
      orderBy: { createdAt: "desc" },
    }),
    getGithubConnection(user.id),
  ]);

  const live = accounts.filter((account) => account.deployStatus === "LIVE").length;
  const building = accounts.filter((account) => account.deployStatus === "BUILDING").length;

  return (
    <div className="space-y-7">
      <section className="sites-hero">
        <div className="sites-hero-grid">
          <div>
            <p className="page-kicker">Workspace</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)] sm:text-[2.1rem]">Your sites</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)] sm:text-[0.95rem]">
              Import from GitHub, watch the build console, and open production-ready previews — static or full SSR with databases.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="#repositories" className="btn btn-primary">
                <Rocket className="h-4 w-4" />
                New deployment
              </a>
              <Link href="/hosting" className="btn btn-ghost">
                <Server className="h-4 w-4" />
                Hosting plans
              </Link>
            </div>
          </div>
          <div className="sites-stat-strip">
            <div className="sites-stat">
              <span>Sites</span>
              <strong>{accounts.length}</strong>
            </div>
            <div className="sites-stat">
              <span>Live</span>
              <strong>{live}</strong>
            </div>
            <div className="sites-stat">
              <span>Building</span>
              <strong>{building}</strong>
            </div>
          </div>
        </div>
      </section>

      <section id="repositories" className="scroll-mt-6">
        <GithubRepoPicker
          configured={isGithubConfigured()}
          connected={github.connected}
          login={github.login}
          avatarUrl={github.avatarUrl}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle
          icon={Server}
          title="Deployed projects"
          action={
            accounts.length ? (
              <span className="text-sm text-[var(--muted)]">
                {accounts.length} project{accounts.length === 1 ? "" : "s"}
              </span>
            ) : null
          }
        />
        {accounts.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {accounts.map((account) => {
              const days = trialDaysLeft(account.trialEndsAt);
              const previewSrc =
                account.deployStatus === "LIVE" && account.previewUrl
                  ? account.runtimeMode === "server"
                    ? account.previewUrl
                    : account.previewSlug
                      ? `/p/${account.previewSlug}/site`
                      : null
                  : null;
              return (
                <article key={account.id} className="site-card">
                  <Link
                    href={account.previewUrl ?? `/hosting/${account.id}`}
                    target={account.previewUrl ? "_blank" : undefined}
                    className="site-card-preview group"
                  >
                    {previewSrc ? (
                      <iframe
                        title={`${account.githubRepo ?? account.plan.name} preview`}
                        src={previewSrc}
                        sandbox="allow-forms allow-modals allow-popups allow-scripts allow-same-origin"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-white/70">
                        {account.deployStatus === "BUILDING" ? (
                          <>
                            <Clock3 className="h-5 w-5 text-[#8cbcff]" />
                            Building preview…
                          </>
                        ) : (
                          "Preview not ready yet"
                        )}
                      </div>
                    )}
                    <span className="absolute right-3 top-3 rounded-full bg-white/92 px-2.5 py-1 text-xs font-bold text-[var(--navy)] opacity-0 shadow transition group-hover:opacity-100">
                      Open <ArrowUpRight className="ml-1 inline h-3.5 w-3.5" />
                    </span>
                  </Link>
                  <div className="site-card-body">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-extrabold text-[var(--navy)]">
                          {account.githubRepo ?? account.plan.name}
                        </p>
                        <p className="mt-1 truncate text-sm text-[var(--muted)]">
                          {account.domain?.name ?? "No custom domain"}
                          {account.runtimeMode === "server" ? " · SSR" : " · Static"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {account.isTrial ? <StatusBadge status="TRIAL" /> : null}
                        <StatusBadge
                          status={
                            account.deployStatus === "LIVE"
                              ? "LIVE"
                              : account.deployStatus === "BUILDING"
                                ? "BUILDING"
                                : account.status
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Meta label="Framework" value={account.framework ?? "Static"} />
                      <Meta label="Last deploy" value={account.lastDeployAt ? formatDate(account.lastDeployAt) : "Not deployed"} />
                      <Meta label="Environment" value={`${publicEnvKeys(account.envVarsJson).length} variables`} />
                      <Meta
                        label="Preview"
                        value={account.isTrial ? (days ? `${days} days left` : "Ended") : account.plan.name}
                      />
                    </div>
                    {account.deployStatus === "BUILDING" && account.lastDeployLog ? (
                      <p className="truncate rounded-lg border border-[#d7e4f5] bg-[#f4f8fd] px-3 py-2 font-mono text-[11px] text-[var(--muted)]">
                        {account.lastDeployLog.split("\n").filter(Boolean).at(-1)}
                      </p>
                    ) : null}
                    <div className="mt-auto flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                      <Link href={`/hosting/${account.id}`} className="btn btn-primary">
                        Manage site
                      </Link>
                      {account.deployStatus === "FAILED" || account.deployStatus === "LIVE" ? (
                        <Link href={`/hosting/${account.id}`} className="btn btn-hot">
                          Redeploy
                        </Link>
                      ) : null}
                      {account.previewUrl ? (
                        <a href={account.previewUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
                          <ExternalLink className="h-4 w-4" />
                          Open preview
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Github}
            title="Your first site starts here"
            body="Connect GitHub above, choose a repository, and we will check, build, and publish a preview."
          />
        )}
      </section>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 truncate font-semibold text-[var(--navy)]">{value}</p>
    </div>
  );
}
