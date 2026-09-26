import Link from "next/link";
import { Server } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { Meter, StatusBadge } from "@/components/status-badge";
import { AddServerForm } from "@/components/add-server-form";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminServersPage() {
  await getAdminContext();
  const servers = await prisma.server.findMany({
    include: { _count: { select: { accounts: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader kicker="Operations" title="Servers" description="Machines that host customer sites." />
      <AddServerForm />
      {servers.length ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {servers.map((server) => (
            <Link key={server.id} href={`/admin/servers/${server.id}`} className="card p-5 hover:border-[#c9d8ea]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-[var(--navy)]" />
                  <h2 className="font-bold">{server.name}</h2>
                </div>
                <StatusBadge status={server.status} />
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{server.location} · {server.ipAddress}</p>
              <p className="mt-2 text-sm">Active accounts: {server._count.accounts}</p>
              <div className="mt-4 space-y-3">
                <Meter label="CPU" value={server.cpuPercent} />
                <Meter label="RAM" value={server.ramPercent} />
                <Meter label="Disk" value={server.diskPercent} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Server} title="No servers" body="Add a server when you are ready to host customer plans." />
        </div>
      )}
    </div>
  );
}
