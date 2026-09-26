import Link from "next/link";
import { CreditCard, FileText, RefreshCw, Search, ShoppingCart } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";
import { formatDate, formatUsd } from "@/lib/utils";

export default async function BillingPage() {
  const { customerId } = await getCustomerContext();
  const [invoices, payments, subscriptions, renewals] = await Promise.all([
    prisma.invoice.findMany({ where: { customerId }, orderBy: { issuedAt: "desc" } }),
    prisma.payment.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } }),
    prisma.subscription.findMany({ where: { customerId } }),
    prisma.renewal.findMany({ where: { customerId }, orderBy: { dueAt: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader kicker="Finance" title="Billing" description="Invoices, payments, and upcoming renewals." />
      <section className="card p-5">
        <SectionTitle icon={RefreshCw} title="Upcoming renewals" />
        {renewals.length ? (
          <div className="space-y-3">
            {renewals.map((item) => (
              <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-[var(--line)] px-4 py-3">
                <div>
                  <p className="font-semibold">{item.label}</p>
                  <p className="text-sm text-[var(--muted)]">
                    Renews {formatDate(item.dueAt)} · Auto renew {item.autoRenew ? "on" : "off"}
                  </p>
                </div>
                <p className="font-bold">{formatUsd(item.amountCents)}/year</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={RefreshCw} title="No renewals due" body="When a domain or hosting plan is close to expiry, it will show up here." />
        )}
      </section>
      <section className="card table-wrap p-5">
        <SectionTitle icon={FileText} title="Invoices" />
        {invoices.length ? (
          <table className="data">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="font-semibold">{invoice.number}</td>
                  <td>{formatUsd(invoice.amountCents)}</td>
                  <td><StatusBadge status={invoice.status} /></td>
                  <td>{formatDate(invoice.issuedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={FileText} title="No invoices" body="Paid orders create invoices automatically." />
        )}
      </section>
      <section className="card table-wrap p-5">
        <SectionTitle icon={CreditCard} title="Payments" />
        {payments.length ? (
          <table className="data">
            <thead>
              <tr>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-semibold">{formatUsd(payment.amountCents)}</td>
                  <td><StatusBadge status={payment.status} /></td>
                  <td>{formatDate(payment.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState icon={CreditCard} title="No payments yet" body="Checkout a cart to see payments here." />
        )}
      </section>
      <section className="card p-5">
        <SectionTitle icon={ShoppingCart} title="Subscriptions" />
        {subscriptions.length ? (
          <div className="space-y-2">
            {subscriptions.map((item) => (
              <p key={item.id} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm">
                <span className="font-semibold">{item.label}</span>
                {" · "}
                {formatUsd(item.amountCents)} · renews {formatDate(item.renewsAt)}
              </p>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingCart}
            title="No subscriptions"
            body="Domain and service subscriptions will show up here after checkout."
            action={
              <Link href="/search" className="btn btn-ghost">
                <Search className="h-4 w-4" />
                Find a domain
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
