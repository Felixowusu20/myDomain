import Link from "next/link";
import { Network, Search } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCustomerContext } from "@/lib/page-auth";
import { EmptyState, PageHeader } from "@/components/ui";

export default async function DnsPage() {
  const { customerId } = await getCustomerContext();
  const domains = await prisma.domain.findMany({
    where: { customerId },
    include: { dnsRecords: true },
  });
  return (
    <div className="space-y-5">
      <PageHeader
        kicker="DNS"
        title="DNS"
        description="After you buy a domain, use Connect to Vercel on the domain page — or manage raw records here."
      />
      {domains.length ? (
        domains.map((domain) => (
          <section key={domain.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="stat-icon">
                  <Network className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-bold">{domain.name}</h2>
                  <p className="text-sm text-[var(--muted)]">{domain.dnsRecords.length} records</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/domains/${domain.id}#connect`} className="btn btn-hot">
                  Connect to Vercel
                </Link>
                <Link href={`/domains/${domain.id}#dns`} className="btn btn-ghost">
                  Manage DNS
                </Link>
              </div>
            </div>
          </section>
        ))
      ) : (
        <div className="card">
          <EmptyState
            icon={Network}
            title="No domains to manage"
            body="Register a domain first, then DNS records will appear here."
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
