import Link from "next/link";
import { Activity, CreditCard, Globe, Server, ShoppingBag, Users } from "lucide-react";
import { getAdminContext } from "@/lib/page-auth";
import { adminDashboard } from "@/lib/services/admin.service";
import { systemHealth } from "@/lib/jobs/runner";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader, SectionTitle, StatCard } from "@/components/ui";
import { formatDate, formatUsd } from "@/lib/utils";

export default async function AdminHomePage() {
  await getAdminContext();
  const [dash, health] = await Promise.all([adminDashboard(), systemHealth()]);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Overview"
        title="Admin dashboard"
        description="Domains, customers, and billing. Payments are free (mock) while you test registrations."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Users} label="Customers" value={dash.totalCustomers.toLocaleString()} />
        <StatCard icon={Globe} label="Active domains" value={dash.activeDomains.toLocaleString()} />
        <StatCard icon={Server} label="Hosting accounts" value={dash.activeHostingAccounts.toLocaleString()} />
        <StatCard icon={CreditCard} label="Monthly revenue" value={formatUsd(dash.monthlyRevenueCents)} />
        <StatCard icon={ShoppingBag} label="Pending orders" value={dash.pendingOrders} />
        <StatCard icon={Activity} label="Upcoming renewals" value={dash.upcomingRenewals} />
      </div>
      <section className="card p-5">
        <SectionTitle icon={Activity} title="System health" />
        <div className="grid gap-3 md:grid-cols-3">
          <Health label="Database" status={health.database === "Healthy" ? "Healthy" : "ERROR"} />
          {health.providers.map((provider) => (
            <Health key={provider.type} label={`${provider.type} provider`} status={provider.status} />
          ))}
          <Health
            label="Background jobs"
            status={health.jobs.some((job) => job.status === "RUNNING") ? "Healthy" : "IDLE"}
          />
        </div>
      </section>
      <section className="card table-wrap p-5">
        <SectionTitle icon={ShoppingBag} title="Recent orders" />
        {dash.recentOrders.length ? (
          <table className="data">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {dash.recentOrders.map((order) => (
                <tr key={order.id}>
                  <td className="font-semibold">{order.customer.user.name}</td>
                  <td>{order.items[0]?.description ?? "Order"}</td>
                  <td>{formatUsd(order.totalCents)}</td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={ShoppingBag} title="No orders yet" body="Customer checkouts will show up here." />
        )}
      </section>
      <section className="card p-5">
        <SectionTitle icon={Server} title="Server health" />
        {dash.servers.length ? (
          <div className="space-y-3">
            {dash.servers.map((server) => (
              <Link key={server.id} href={`/admin/servers/${server.id}`} className="flex items-center justify-between rounded-xl border border-[var(--line)] px-4 py-3 hover:bg-[var(--nm-panel-soft)]">
                <span className="font-semibold">{server.name}</span>
                <StatusBadge status={server.status} />
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon={Server} title="No servers yet" body="Add a server from the Servers page when you have hosting capacity." />
        )}
      </section>
    </div>
  );
}

function Health({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[var(--line)] px-3 py-2 text-sm">
      <span>{label}</span>
      <StatusBadge status={status} />
    </div>
  );
}
