import { KeyRound } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { DeveloperKeyActions, DeveloperKeyForm, DeveloperProjectForm } from "@/components/developer-console";
import { DeveloperNav } from "@/components/developer-nav";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { parseScopes } from "@/lib/security/api-key";
import { formatDate } from "@/lib/utils";

export default async function DeveloperKeysPage() {
  const { customerId } = await getCustomerContext();
  const [projects, keys] = await Promise.all([
    prisma.apiProject.findMany({ where: { customerId }, orderBy: { createdAt: "desc" } }),
    prisma.apiKey.findMany({
      where: { project: { customerId } },
      include: { project: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="SMS & OTP"
        title="API keys"
        description="The secret is shown once, when you create or rotate a key. Admins can see the prefix and usage, not the secret."
      />
      <DeveloperNav />
      <div className="grid gap-4 lg:grid-cols-2">
        <DeveloperProjectForm />
        <DeveloperKeyForm projects={projects.map((project) => ({ id: project.id, name: project.name }))} />
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
                  <td>{key.status === "ACTIVE" ? <DeveloperKeyActions id={key.id} /> : null}</td>
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
