import { Server } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDate } from "@/lib/utils";
import { HostingAdminActions } from "@/components/hosting-admin-actions";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminHostingPage() {
  await getAdminContext();
  const accounts = await prisma.hostingAccount.findMany({
    include: {
      customer: { include: { user: true } },
      domain: true,
      plan: true,
      server: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader kicker="Inventory" title="Hosting" description="Accounts, plans, and the servers they run on." />
      {accounts.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Account</th>
                <th>Customer</th>
                <th>Domain</th>
                <th>Plan</th>
                <th>GitHub</th>
                <th>Server</th>
                <th>Status</th>
                <th>Renewal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td className="font-semibold">{account.username}</td>
                  <td>{account.customer.user.name}</td>
                  <td>{account.domain?.name ?? "None"}</td>
                  <td>{account.plan.name}{account.isTrial ? " · trial" : ""}</td>
                  <td>{account.githubRepo ?? "—"}</td>
                  <td>{account.server.name}</td>
                  <td>
                    <span className="flex flex-wrap items-center gap-1">
                      {account.isTrial ? <StatusBadge status="TRIAL" /> : null}
                      <StatusBadge status={account.status} />
                    </span>
                  </td>
                  <td>{formatDate(account.renewsAt)}</td>
                  <td><HostingAdminActions id={account.id} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Server} title="No hosting accounts" body="Purchased plans will show up here." />
        </div>
      )}
    </div>
  );
}
