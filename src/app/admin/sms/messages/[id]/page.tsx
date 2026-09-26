import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { maskPhone } from "@/lib/messaging/phone";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function AdminSmsMessagePage({ params }: { params: Promise<{ id: string }> }) {
  await getAdminContext();
  const { id } = await params;
  const message = await prisma.smsMessage.findUnique({
    where: { id },
    include: {
      project: { include: { customer: { include: { user: true } } } },
      attempts: { orderBy: { startedAt: "asc" } },
      apiKey: true,
    },
  });
  if (!message) notFound();

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Messaging"
        title="Message"
        description={message.bodyPreview}
        actions={
          <Link href="/admin/sms" className="btn btn-ghost">
            Back
          </Link>
        }
      />
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="text-sm text-[var(--muted)]">Message ID</p>
          <p className="font-mono text-sm">{message.id}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Status</p>
          <StatusBadge status={message.status} />
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Project</p>
          <p className="font-semibold">{message.project.name}</p>
          <p className="text-sm text-[var(--muted)]">{message.project.customer.user.email}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Destination</p>
          <p className="font-semibold">{maskPhone(message.toE164)}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Sender</p>
          <p className="font-semibold">{message.senderId}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Route</p>
          <p className="font-semibold">
            {message.route === "mock" ? "mock — development connector, not a mobile network" : message.route}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">API key</p>
          <p className="font-semibold">{message.apiKey?.prefix ?? "None"}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Retries</p>
          <p className="font-semibold">
            {message.retryCount}/{message.maxRetries}
          </p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Error</p>
          <p className="font-semibold">{message.errorCode ?? "None"}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Queued</p>
          <p className="font-semibold">{formatDate(message.queuedAt)}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Sent</p>
          <p className="font-semibold">{formatDate(message.sentAt)}</p>
        </div>
        <div>
          <p className="text-sm text-[var(--muted)]">Delivered</p>
          <p className="font-semibold">{formatDate(message.deliveredAt)}</p>
        </div>
      </section>
      <section className="card p-5">
        <h2 className="mb-3 font-bold text-[var(--navy)]">Attempts</h2>
        {message.attempts.length ? (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Connector</th>
                  <th>Status</th>
                  <th>Error</th>
                  <th>Finished</th>
                </tr>
              </thead>
              <tbody>
                {message.attempts.map((attempt) => (
                  <tr key={attempt.id}>
                    <td>{attempt.connector}</td>
                    <td>{attempt.status}</td>
                    <td>{attempt.errorCode ?? "None"}</td>
                    <td>{formatDate(attempt.finishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--muted)]">The worker has not attempted delivery yet.</p>
        )}
      </section>
    </div>
  );
}
