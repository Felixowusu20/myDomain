import Link from "next/link";
import { Globe, Search, Settings } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, PageHeader } from "@/components/ui";
import { formatDate, parseJson } from "@/lib/utils";
import { displayNameservers } from "@/lib/domain-nameservers";

export default async function DomainsPage() {
  const { customerId } = await getCustomerContext();
  const domains = await prisma.domain.findMany({
    where: {
      customerId,
      NOT: { name: { contains: "mocktld" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Inventory"
        title="Domains"
        description="Everything you have registered with myDomain."
        actions={
          <Link href="/search" className="btn btn-hot">
            <Search className="h-4 w-4" />
            Register domain
          </Link>
        }
      />
      {domains.length ? (
        <div className="card table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Expires</th>
                <th>Auto renew</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => {
                const nameservers = displayNameservers(parseJson<string[]>(domain.nameserversJson, []));
                return (
                  <tr key={domain.id}>
                    <td>
                      <div className="flex items-center gap-2 font-semibold">
                        <Globe className="h-4 w-4 text-[var(--accent)]" />
                        {domain.name}
                      </div>
                      <p className="text-xs text-[var(--muted)]">
                        {nameservers.length
                          ? nameservers.slice(0, 2).join(" · ")
                          : "Nameservers pending"}
                      </p>
                    </td>
                    <td><StatusBadge status={domain.status} /></td>
                    <td>{formatDate(domain.registeredAt)}</td>
                    <td>{formatDate(domain.expiresAt)}</td>
                    <td>{domain.autoRenew ? "On" : "Off"}</td>
                    <td>
                      <Link href={`/domains/${domain.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)]">
                        <Settings className="h-4 w-4" />
                        Manage
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card">
          <EmptyState
            icon={Globe}
            title="No domains yet"
            body="Search a name and add an available extension to your cart."
            action={
              <Link href="/search" className="btn btn-hot">
                <Search className="h-4 w-4" />
                Find a domain
              </Link>
            }
          />
        </div>
      )}
    </div>
  );
}
