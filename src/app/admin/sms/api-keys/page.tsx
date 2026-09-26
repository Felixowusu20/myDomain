import { KeyRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { SmsKeyActions, SmsKeyForm, SmsProjectForm } from "@/components/admin-sms";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { parseScopes } from "@/lib/security/api-key";
import { formatDate } from "@/lib/utils";

export default async function AdminApiKeysPage() {
  await getAdminContext();
  const [customers, projects, keys] = await Promise.all([
    prisma.customer.findMany({
      where: { user: { status: "ACTIVE" } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.apiProject.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.apiKey.findMany({ include: { project: true }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Messaging"
        title="API keys"
        description="Keys are hashed. A secret is shown only when you create or rotate it."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <SmsProjectForm
          customers={customers.map((customer) => ({
            id: customer.id,
            name: customer.user.name,
            email: customer.user.email,
          }))}
        />
        <SmsKeyForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
      </div>
      {keys.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Prefix</th>
                <th>Project</th>
                <th>Scopes</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td className="font-semibold">{key.name}</td>
                  <td className="font-mono text-xs">{key.prefix}</td>
                  <td>{key.project.name}</td>
                  <td className="text-xs">{parseScopes(key.scopesJson).join(", ")}</td>
                  <td>
                    <StatusBadge status={key.status} />
                  </td>
                  <td>{formatDate(key.createdAt)}</td>
                  <td>{key.status === "ACTIVE" ? <SmsKeyActions id={key.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState icon={KeyRound} title="No API keys" body="Create a project, then issue a key for that app." />
        </div>
      )}
    </div>
  );
}
