import { Hash } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { SmsSenderDisable, SmsSenderForm } from "@/components/admin-sms";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function AdminSenderIdsPage() {
  await getAdminContext();
  const [projects, senders] = await Promise.all([
    prisma.apiProject.findMany({ orderBy: { name: "asc" } }),
    prisma.senderId.findMany({ include: { project: true }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Messaging"
        title="Sender IDs"
        description="Sender IDs here are labels for routing. They are not registered with MTN, Telecel, or AirtelTigo."
      />
      <SmsSenderForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
      {senders.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Sender</th>
                <th>Project</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {senders.map((sender) => (
                <tr key={sender.id}>
                  <td className="font-semibold">{sender.value}</td>
                  <td>{sender.project.name}</td>
                  <td>
                    <StatusBadge status={sender.status} />
                  </td>
                  <td>{sender.status === "ACTIVE" ? <SmsSenderDisable id={sender.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={Hash} title="No sender IDs" body="A default sender is created with each project." />
        </div>
      )}
    </div>
  );
}
