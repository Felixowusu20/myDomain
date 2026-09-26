import { Hash } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { DeveloperSenderDisable, DeveloperSenderForm } from "@/components/developer-console";
import { DeveloperNav } from "@/components/developer-nav";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function DeveloperSendersPage() {
  const { customerId } = await getCustomerContext();
  const [projects, senders] = await Promise.all([
    prisma.apiProject.findMany({ where: { customerId }, orderBy: { name: "asc" } }),
    prisma.senderId.findMany({
      where: { project: { customerId } },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="SMS & OTP"
        title="Sender IDs"
        description="These labels are stored for your project. They are not registered with a carrier."
      />
      <DeveloperNav />
      <DeveloperSenderForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
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
                  <td>{sender.status === "ACTIVE" ? <DeveloperSenderDisable id={sender.id} /> : null}</td>
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
