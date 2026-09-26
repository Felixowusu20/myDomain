import Link from "next/link";
import { LifeBuoy } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { SupportForm } from "@/components/support-form";
import { EmptyState, PageHeader, SectionTitle } from "@/components/ui";

export default async function SupportPage() {
  const { customerId } = await getCustomerContext();
  const tickets = await prisma.supportTicket.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader kicker="Help" title="Support" description="Send a message. We keep it simple, no ticket maze." />
      <SupportForm />
      <section className="card p-5">
        <SectionTitle icon={LifeBuoy} title="Your tickets" />
        {tickets.length ? (
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-[var(--line)] px-4 py-3">
                <div className="flex justify-between gap-3">
                  <p className="font-semibold">{ticket.subject}</p>
                  <StatusBadge status={ticket.status} />
                </div>
                <p className="mt-2 text-sm text-[var(--muted)]">{ticket.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={LifeBuoy} title="No tickets yet" body="Ask a question above if something is not working." />
        )}
      </section>
    </div>
  );
}
