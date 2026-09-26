import { ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatUsd } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminOrdersPage() {
  await getAdminContext();
  const orders = await prisma.order.findMany({
    include: { customer: { include: { user: true } }, items: true },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader kicker="Commerce" title="Orders" description="Completed and pending customer checkouts." />
      {orders.length ? (
        <div className="card table-wrap">
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
              {orders.map((order) => (
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
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={ShoppingBag} title="No orders" body="Cart checkouts will land here." />
        </div>
      )}
    </div>
  );
}
