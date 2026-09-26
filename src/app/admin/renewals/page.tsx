import { RefreshCw } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { formatDate, formatUsd } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminRenewalsPage() {
  await getAdminContext();
  const renewals = await prisma.renewal.findMany({
    include: { customer: { include: { user: true } } },
    orderBy: { dueAt: "asc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader kicker="Products" title="Renewals" description="Upcoming domain and hosting renewals." />
      {renewals.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Item</th>
                <th>Customer</th>
                <th>Due</th>
                <th>Amount</th>
                <th>Auto renew</th>
              </tr>
            </thead>
            <tbody>
              {renewals.map((item) => (
                <tr key={item.id}>
                  <td className="font-semibold">{item.label}</td>
                  <td>{item.customer.user.name}</td>
                  <td>{formatDate(item.dueAt)}</td>
                  <td>{formatUsd(item.amountCents)}</td>
                  <td>{item.autoRenew ? "On" : "Off"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={RefreshCw} title="No upcoming renewals" body="Expiring services will appear here." />
        </div>
      )}
    </div>
  );
}
