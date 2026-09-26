import Link from "next/link";
import { KeyRound, MessageSquare, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { DeveloperNav } from "@/components/developer-nav";
import { maskPhone } from "@/lib/messaging/phone";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader, StatCard } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function DeveloperHomePage() {
  const { customerId } = await getCustomerContext();
  const where = { project: { customerId } };
  const [projects, keys, usage, messages, otpCount] = await Promise.all([
    prisma.apiProject.count({ where: { customerId } }),
    prisma.apiKey.count({ where: { project: { customerId }, status: "ACTIVE" } }),
    prisma.usageRecord.aggregate({ where: { customerId }, _sum: { units: true } }),
    prisma.smsMessage.findMany({
      where,
      include: { project: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.otpRequest.count({ where: { project: { customerId }, consumedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="SMS & OTP"
        title="SMS & OTP"
        description="Send one-time verification codes and text messages from your apps. Create a project, issue an API key, and every send is tracked here and in the admin panel."
        actions={
          <Link href="/docs" className="btn btn-ghost">
            Public docs
          </Link>
        }
      />
      <DeveloperNav />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={KeyRound} label="Projects" value={projects} />
        <StatCard icon={ShieldCheck} label="Active keys" value={keys} />
        <StatCard icon={MessageSquare} label="Usage units" value={usage._sum.units ?? 0} hint="1 SMS = 1 unit" />
        <StatCard icon={ShieldCheck} label="Verified OTPs" value={otpCount} />
      </div>
      <section className="card p-5">
        <h2 className="font-bold text-[var(--navy)]">Delivery</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Messages are queued and marked delivered by the development mock connector. That receipt is simulated. It is
          not a message from a mobile network.
        </p>
      </section>
      {messages.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Type</th>
                <th>Project</th>
                <th>To</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td>
                    <Link className="font-semibold text-[var(--navy)]" href={`/sms/messages/${message.id}`}>
                      {message.type}
                    </Link>
                  </td>
                  <td>{message.project.name}</td>
                  <td>{maskPhone(message.toE164)}</td>
                  <td>
                    <StatusBadge status={message.status} />
                  </td>
                  <td>{formatDate(message.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            body="Create a key, then call POST /api/v1/otp/send."
          />
        </div>
      )}
    </div>
  );
}
