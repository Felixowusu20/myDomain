import { Globe } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate, formatUsd } from "@/lib/utils";
import { AdminSyncButton } from "@/components/admin-sync-button";

export default async function AdminDomainsPage() {
  await getAdminContext();
  const [domains, pricing] = await Promise.all([
    prisma.domain.findMany({
      include: { customer: { include: { user: true } }, provider: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tldPricing.findMany(),
  ]);
  const priceMap = new Map(pricing.map((row) => [row.tld, row]));
  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Inventory"
        title="Domains"
        description="Registered names, with original name.com prices for each extension."
        actions={<AdminSyncButton path="/api/admin/domains/sync" label="Sync from name.com" />}
      />
      {domains.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Original</th>
                <th>Your cost</th>
                <th>Your price</th>
                <th>Expiration</th>
                <th>Auto renew</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => {
                const row = priceMap.get(domain.tld);
                return (
                  <tr key={domain.id}>
                    <td className="font-semibold">{domain.name}</td>
                    <td>{domain.customer.user.name}</td>
                    <td><StatusBadge status={domain.status} /></td>
                    <td>{row?.originalCents ? formatUsd(row.originalCents) : "—"}</td>
                    <td>{row?.wholesaleCents ? formatUsd(row.wholesaleCents) : "—"}</td>
                    <td>{row?.retailCents ? formatUsd(row.retailCents) : "—"}</td>
                    <td>{formatDate(domain.expiresAt)}</td>
                    <td>{domain.autoRenew ? "On" : "Off"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Globe} title="No domains yet" body="Customer registrations will appear here." />
        </div>
      )}
    </div>
  );
}
