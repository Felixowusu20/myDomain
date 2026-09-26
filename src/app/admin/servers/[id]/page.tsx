import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Server } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { Meter, StatusBadge } from "@/components/status-badge";
import { ServerStatusForm } from "@/components/server-status-form";
import { PageHeader, SectionTitle } from "@/components/ui";

export default async function AdminServerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getAdminContext();
  const { id } = await params;
  const server = await prisma.server.findUnique({
    where: { id },
    include: { accounts: { include: { customer: { include: { user: true } }, plan: true } } },
  });
  if (!server) notFound();
  return (
    <div className="space-y-5">
      <Link href="/admin/servers" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
        <ArrowLeft className="h-4 w-4" />
        All servers
      </Link>
      <PageHeader
        kicker={server.location}
        title={server.name}
        description={server.ipAddress}
        actions={<StatusBadge status={server.status} />}
      />
      <ServerStatusForm id={server.id} status={server.status} />
      <div className="card space-y-3 p-5">
        <SectionTitle icon={Server} title="Usage" />
        <Meter label="CPU" value={server.cpuPercent} />
        <Meter label="RAM" value={server.ramPercent} />
        <Meter label="Disk" value={server.diskPercent} />
      </div>
      <section className="card p-5">
        <SectionTitle title="Accounts" />
        {server.accounts.length ? server.accounts.map((account) => (
          <p key={account.id} className="mt-2 text-sm">
            {account.customer.user.name} · {account.plan.name} · {account.status}
          </p>
        )) : <p className="text-sm text-[var(--muted)]">No accounts on this server.</p>}
      </section>
    </div>
  );
}
