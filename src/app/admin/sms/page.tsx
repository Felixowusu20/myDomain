import Link from "next/link";
import { MessageSquare, ShieldCheck, Timer, XCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { maskPhone } from "@/lib/messaging/phone";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function AdminSmsPage() {
  await getAdminContext();
  const [grouped, pending, usage, messages] = await Promise.all([
    prisma.smsMessage.groupBy({ by: ["status"], _count: true }),
    prisma.smsMessage.count({ where: { status: { in: ["QUEUED", "PROCESSING"] } } }),
    prisma.usageRecord.aggregate({ _sum: { units: true } }),
    prisma.smsMessage.findMany({
      include: { project: { include: { customer: { include: { user: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);
  const count = (status: string) => grouped.find((row) => row.status === status)?._count ?? 0;

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Messaging"
        title="SMS"
        description="Customers create keys from SMS & OTP in their account. This view tracks every project. Delivery is still the development mock until a network connector is configured."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={MessageSquare} label="Usage units" value={usage._sum.units ?? 0} hint="1 SMS = 1 unit" />
        <StatCard icon={Timer} label="Pending" value={pending} />
        <StatCard icon={ShieldCheck} label="Delivered" value={count("DELIVERED")} hint="Mock receipts are simulated" />
        <StatCard icon={XCircle} label="Failed" value={count("FAILED") + count("REJECTED")} />
      </div>
      {messages.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Message</th>
                <th>Customer</th>
                <th>Project</th>
                <th>To</th>
                <th>Status</th>
                <th>Route</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td>
                    <Link className="font-semibold text-[var(--navy)]" href={`/admin/sms/messages/${message.id}`}>
                      {message.type}
                    </Link>
                  </td>
                  <td>{message.project.customer.user.email}</td>
                  <td>{message.project.name}</td>
                  <td>{maskPhone(message.toE164)}</td>
                  <td>
                    <StatusBadge status={message.status} />
                  </td>
                  <td>{message.route === "mock" ? "mock (development)" : message.route}</td>
                  <td>{formatDate(message.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={MessageSquare} title="No messages" body="SMS and OTP sends will show up here." />
        </div>
      )}
    </div>
  );
}
