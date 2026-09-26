import Link from "next/link";
import { ArrowRight, CreditCard, Globe, RefreshCw, Search, Sparkles } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, SectionTitle, StatCard, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function DashboardPage() {
  const { user, customerId } = await getCustomerContext();
  const [domains, renewals] = await Promise.all([
    prisma.domain.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } }),
    prisma.renewal.findMany({
      where: { customerId, status: "UPCOMING" },
      orderBy: { dueAt: "asc" },
    }),
  ]);
  const soon = new Date();
  soon.setDate(soon.getDate() + 60);
  const expiring = domains.filter((domain) => domain.expiresAt && domain.expiresAt <= soon).length;
  const active = domains.filter((d) => d.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Customer dashboard"
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description="Search, buy, and manage domains. Use SMS & OTP to send verification codes and text messages from your own apps."
        actions={
          <>
            <Link href="/search" className="btn btn-hot">
              <Search className="h-4 w-4" />
              Find a domain
            </Link>
            <Link href="/sms" className="btn btn-ghost">
              <Sparkles className="h-4 w-4" />
              SMS & OTP
            </Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Globe} label="Domains" value={domains.length} />
        <StatCard icon={Sparkles} label="Active" value={active} />
        <StatCard icon={CreditCard} label="Services" value={active} />
        <StatCard icon={RefreshCw} label="Upcoming renewals" value={renewals.length || expiring} />
      </div>
      <section className="card p-5">
        <SectionTitle
          icon={Globe}
          title="Your domains"
          action={
            <Link href="/domains" className="text-sm font-semibold text-[var(--accent)]">
              View all
            </Link>
          }
        />
        <div className="space-y-3">
          {domains.map((domain) => (
            <Link
              key={domain.id}
              href={`/domains/${domain.id}`}
              className="flex items-center justify-between rounded-xl border border-[var(--line)] px-4 py-3 hover:bg-[#f8fbff]"
            >
              <div>
                <span className="font-semibold">{domain.name}</span>
                <p className="text-sm text-[var(--muted)]">Open to connect Vercel DNS</p>
              </div>
              <span className="flex items-center gap-2">
                <StatusBadge
                  status={
                    domain.expiresAt && domain.expiresAt <= soon && domain.status === "ACTIVE"
                      ? "WARNING"
                      : domain.status
                  }
                />
                <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
              </span>
            </Link>
          ))}
          {!domains.length ? (
            <EmptyState
              icon={Globe}
              title="No domains yet"
              body="Search a name and add it to your cart."
              action={
                <Link href="/search" className="btn btn-primary">
                  Find a domain
                </Link>
              }
            />
          ) : null}
        </div>
      </section>
      {renewals.length ? (
        <section className="card p-5">
          <SectionTitle icon={RefreshCw} title="Upcoming renewals" />
          <div className="space-y-3">
            {renewals.map((renewal) => (
              <div
                key={renewal.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--line)] px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{renewal.label}</p>
                  <p className="text-sm text-[var(--muted)]">Renews {formatDate(renewal.dueAt)}</p>
                </div>
                <StatusBadge status={renewal.autoRenew ? "ACTIVE" : "WARNING"} />
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
