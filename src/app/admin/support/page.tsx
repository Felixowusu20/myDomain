import { LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminSupportPage() {
  await getAdminContext();
  const tickets = await prisma.supportTicket.findMany({
    include: { customer: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader kicker="Operations" title="Support" description="Messages from customers." />
      {tickets.length ? (
        tickets.map((ticket) => (
          <div key={ticket.id} className="card p-5">
            <div className="flex justify-between gap-3">
              <p className="font-semibold">{ticket.subject}</p>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">{ticket.customer.user.email}</p>
            <p className="mt-2 text-sm">{ticket.message}</p>
          </div>
        ))
      ) : (
        <div className="card">
          <EmptyState icon={LifeBuoy} title="Inbox is clear" body="New customer tickets will show up here." />
        </div>
      )}
    </div>
  );
}
