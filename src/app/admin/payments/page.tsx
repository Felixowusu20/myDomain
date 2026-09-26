import { CreditCard } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatUsd } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminPaymentsPage() {
  await getAdminContext();
  const payments = await prisma.payment.findMany({
    include: { customer: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader kicker="Commerce" title="Payments" description="Checkout payments from customers." />
      {payments.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-semibold">{payment.customer.user.name}</td>
                  <td>{formatUsd(payment.amountCents)}</td>
                  <td><StatusBadge status={payment.status} /></td>
                  <td>{formatDate(payment.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={CreditCard} title="No payments" body="Successful checkouts create payment records." />
        </div>
      )}
    </div>
  );
}
