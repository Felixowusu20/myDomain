import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Server, ShoppingBag } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { formatDate, formatUsd } from "@/lib/utils";
import { CustomerStatusButtons } from "@/components/customer-status-buttons";
import { AdminCustomerDelete } from "@/components/admin-customer-delete";
import { PageHeader, SectionTitle } from "@/components/ui";

export default async function AdminCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await getAdminContext();
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      user: true,
      domains: true,
      hosting: { include: { plan: true, server: true } },
      orders: { include: { items: true } },
      payments: true,
    },
  });
  if (!customer) notFound();

  return (
    <div className="space-y-5">
      <Link href="/admin/customers" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
        <ArrowLeft className="h-4 w-4" />
        All customers
      </Link>
      <PageHeader
        title={customer.user.name}
        description={`${customer.user.email} · ${customer.user.phone ?? "No phone"}`}
        actions={<CustomerStatusButtons id={customer.id} status={customer.user.status} />}
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Info label="Status" value={<StatusBadge status={customer.user.status} />} />
        <Info label="Joined" value={formatDate(customer.user.createdAt)} />
        <Info label="Orders" value={String(customer.orders.length)} />
      </div>
      <section className="card p-5">
        <SectionTitle icon={Globe} title="Domains" />
        {customer.domains.length ? customer.domains.map((d) => (
          <p key={d.id} className="mt-2 text-sm">{d.name} · {d.status}</p>
        )) : <p className="text-sm text-[var(--muted)]">No domains.</p>}
      </section>
      <section className="card p-5">
        <SectionTitle icon={Server} title="Hosting" />
        {customer.hosting.length ? customer.hosting.map((h) => (
          <p key={h.id} className="mt-2 text-sm">{h.plan.name} · {h.server.name} · {h.status}</p>
        )) : <p className="text-sm text-[var(--muted)]">No hosting.</p>}
      </section>
      <section className="card p-5">
        <SectionTitle icon={ShoppingBag} title="Payments" />
        {customer.payments.length ? customer.payments.map((p) => (
          <p key={p.id} className="mt-2 text-sm">{formatUsd(p.amountCents)} · {p.status} · {formatDate(p.createdAt)}</p>
        )) : <p className="text-sm text-[var(--muted)]">No payments.</p>}
      </section>
      <AdminCustomerDelete
        customerId={customer.id}
        email={customer.user.email}
        name={customer.user.name}
        domainCount={customer.domains.length}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase text-[var(--muted)]">{label}</p>
      <div className="mt-2 font-semibold">{value}</div>
    </div>
  );
}
