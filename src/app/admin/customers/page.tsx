import Link from "next/link";
import { Search, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await getAdminContext();
  const { q } = await searchParams;
  const customers = await prisma.customer.findMany({
    include: { user: true, domains: true, hosting: true },
    orderBy: { createdAt: "desc" },
  });
  const filtered = q
    ? customers.filter(
        (c) =>
          c.user.name.toLowerCase().includes(q.toLowerCase()) ||
          c.user.email.toLowerCase().includes(q.toLowerCase()) ||
          (c.user.phone ?? "").toLowerCase().includes(q.toLowerCase()),
      )
    : customers;

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="People"
        title="Customers"
        description="Manage accounts, suspend non-payers, or permanently wipe abandoned members."
      />
      <form className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search customers"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--field-bg)] py-2.5 pl-10 pr-4 text-[var(--ink)] placeholder:text-[var(--muted)]"
        />
      </form>
      {filtered.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Domains</th>
                <th>Hosting</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link className="font-semibold text-[var(--accent)]" href={`/admin/customers/${customer.id}`}>
                      {customer.user.name}
                    </Link>
                  </td>
                  <td>{customer.user.email}</td>
                  <td>{customer.user.phone ?? "—"}</td>
                  <td><StatusBadge status={customer.user.status} /></td>
                  <td>{customer.domains.length}</td>
                  <td>{customer.hosting.length}</td>
                  <td>{formatDate(customer.user.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Users} title="No customers found" body="Try a different search, or wait for a new signup." />
        </div>
      )}
    </div>
  );
}
