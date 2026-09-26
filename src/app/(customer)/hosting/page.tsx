import Link from "next/link";
import { Check, Github, Server } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { AddHostingButton } from "@/components/add-hosting-button";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { formatUsd } from "@/lib/utils";

export default async function HostingPage({
  searchParams,
}: {
  searchParams: Promise<{ upgrade?: string }>;
}) {
  const { customerId } = await getCustomerContext();
  const { upgrade } = await searchParams;
  const [plans, accounts] = await Promise.all([
    prisma.hostingPlan.findMany({
      where: { active: true, slug: { not: "trial" } },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.hostingAccount.findMany({
      where: { customerId },
      include: { plan: true, server: true, domain: true },
    }),
  ]);
  const trialId =
    upgrade ??
    accounts.find((account) => account.isTrial && account.status !== "TERMINATED")?.id;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Plans"
        title="Hosting"
        description="Start with a GitHub preview for 14 days, then buy a plan and connect your domain."
        actions={
          <Link href="/sites" className="btn btn-ghost">
            <Github className="h-4 w-4" />
            Deploy from GitHub
          </Link>
        }
      />
      {trialId ? (
        <p className="rounded-xl bg-[#eef5ff] px-4 py-3 text-sm font-semibold text-[var(--navy)]">
          Buying a plan upgrades your preview site so the GitHub project and domain stay connected.
        </p>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <div key={plan.id} className={`card relative p-6 ${index === 1 ? "ring-2 ring-[var(--hot)]" : ""}`}>
            {index === 1 ? (
              <p className="absolute -top-3 right-5 rounded-full bg-[var(--hot)] px-3 py-1 text-xs font-bold text-white">
                Popular
              </p>
            ) : null}
            <p className="text-sm font-bold uppercase tracking-wide text-[var(--accent)]">{plan.name}</p>
            <p className="mt-2 text-3xl font-extrabold">
              {formatUsd(plan.yearlyCents)}
              <span className="text-base font-semibold text-[var(--muted)]">/year</span>
            </p>
            <p className="mt-3 text-sm text-[var(--muted)]">{plan.description}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {["Free SSL", "Connect in one click", "Dashboard status"].map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[var(--success)]" />
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <AddHostingButton slug={plan.slug} hostingId={trialId} />
            </div>
          </div>
        ))}
      </div>
      <section className="card p-5">
        <SectionTitle icon={Server} title="Your hosting" />
        {accounts.length ? (
          <div className="space-y-3">
            {accounts.map((account) => (
              <Link key={account.id} href={`/hosting/${account.id}`} className="flex items-center justify-between rounded-xl border border-[var(--line)] px-4 py-3 hover:bg-[#f8fbff]">
                <div>
                  <p className="font-semibold">{account.githubRepo ?? account.plan.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {account.domain?.name ?? "Not connected"} · {account.isTrial ? "Preview" : account.server.name}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  {account.isTrial ? <StatusBadge status="TRIAL" /> : null}
                  <StatusBadge status={account.status} />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Server}
            title="Nothing in hosting yet"
            body="Deploy a GitHub project for a 14-day preview, or add a paid plan to your cart."
            action={
              <Link href="/sites" className="btn btn-primary">
                Deploy from GitHub
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
