import { Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatUsd } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminInvoicesPage() {
  await getAdminContext();
  const invoices = await prisma.invoice.findMany({
    include: { customer: { include: { user: true } } },
    orderBy: { issuedAt: "desc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader kicker="Commerce" title="Invoices" description="Paid invoices generated from orders." />
      {invoices.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Number</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-semibold">{invoice.number}</td>
                  <td>{invoice.customer.user.name}</td>
                  <td>{formatUsd(invoice.amountCents)}</td>
                  <td><StatusBadge status={invoice.status} /></td>
                  <td>{formatDate(invoice.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Receipt} title="No invoices" body="Paid orders generate invoices automatically." />
        </div>
      )}
    </div>
  );
}
