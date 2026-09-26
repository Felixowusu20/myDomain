import { FileText } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { formatDate } from "@/lib/utils";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminAuditPage() {
  await getAdminContext();
  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return (
    <div className="space-y-5">
      <PageHeader kicker="Operations" title="Audit logs" description="Who did what, and when." />
      {logs.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Time</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>{log.actor?.email ?? "system"}</td>
                  <td className="font-semibold">{log.action}</td>
                  <td>{log.entityType}{log.entityId ? ` · ${log.entityId}` : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={FileText} title="No audit events" body="Admin actions will be recorded here." />
        </div>
      )}
    </div>
  );
}
