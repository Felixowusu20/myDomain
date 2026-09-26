import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, Globe, RefreshCw, Server } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDateLong, parseJson } from "@/lib/utils";
import { ConnectVercelPanel } from "@/components/connect-vercel-panel";
import { DomainActions } from "@/components/domain-actions";
import { PageHeader, SectionTitle } from "@/components/ui";
import { displayNameservers } from "@/lib/domain-nameservers";

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { customerId } = await getCustomerContext();
  const { id } = await params;
  const domain = await prisma.domain.findFirst({
    where: { id, customerId },
    include: { dnsRecords: { orderBy: { type: "asc" } } },
  });
  if (!domain) notFound();

  const nameservers = displayNameservers(parseJson<string[]>(domain.nameserversJson, []));
  const canManageDns = domain.status === "ACTIVE" || domain.status === "LOCKED";

  return (
    <div className="space-y-5">
      <Link href="/domains" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
        <ArrowLeft className="h-4 w-4" />
        All domains
      </Link>
      <PageHeader
        kicker="Domain"
        title={domain.name}
        description="Manage registration details, nameservers, and DNS records for this domain."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Info icon={Globe} label="Status" value={<StatusBadge status={domain.status} />} />
        <Info icon={Calendar} label="Registered" value={formatDateLong(domain.registeredAt)} />
        <Info icon={Calendar} label="Expires" value={formatDateLong(domain.expiresAt)} />
        <Info icon={RefreshCw} label="Auto renewal" value={domain.autoRenew ? "On" : "Off"} />
      </div>
      {canManageDns ? (
        <ConnectVercelPanel domainId={domain.id} domainName={domain.name} />
      ) : null}
      <section className="card p-5">
        <SectionTitle icon={Server} title="Nameservers" />
        {nameservers.length ? (
          <div className="mt-3 space-y-2 text-sm">
            {nameservers.map((ns) => (
              <p
                key={ns}
                className="rounded-xl border border-[var(--line)] bg-[var(--field-bg)] px-3 py-2 font-semibold text-[var(--ink)]"
              >
                {ns}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {domain.status === "PENDING_REGISTRATION" || domain.status === "PENDING_TRANSFER"
              ? "Nameservers will appear here once registration finishes."
              : "No nameservers on file yet. Add them in Advanced below when you are ready."}
          </p>
        )}
      </section>
      <DomainActions
        domainId={domain.id}
        domainName={domain.name}
        autoRenew={domain.autoRenew}
        nameservers={nameservers}
        records={domain.dnsRecords}
        locked={domain.locked}
        privacyEnabled={domain.privacyEnabled}
        status={domain.status}
      />
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Globe;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="mt-2 font-semibold text-[var(--ink)]">{value}</div>
    </div>
  );
}
