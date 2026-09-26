import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { DeveloperNav } from "@/components/developer-nav";
import { maskPhone } from "@/lib/messaging/phone";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function DeveloperMessagesPage() {
  const { customerId } = await getCustomerContext();
  const messages = await prisma.smsMessage.findMany({
    where: { project: { customerId } },
    include: { project: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="SMS & OTP"
        title="Messages"
        description="Your queued, delivered, and failed SMS and OTP messages. Destinations are masked."
      />
      <DeveloperNav />
      {messages.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Type</th>
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
                    <Link className="font-semibold" href={`/sms/messages/${message.id}`}>
                      {message.type}
                    </Link>
                  </td>
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
          <EmptyState icon={MessageSquare} title="No messages" body="Sends from your API keys will show up here." />
        </div>
      )}
    </div>
  );
}
