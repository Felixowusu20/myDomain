import { Plug } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { StatusBadge } from "@/components/status-badge";
import { PageHeader, SectionTitle } from "@/components/ui";
import { getNamecomHealth } from "@/lib/providers/namecom/health";
import { getAppUrl } from "@/lib/env";

export default async function AdminProvidersPage() {
  await getAdminContext();
  const providers = await prisma.provider.findMany({ orderBy: { type: "asc" } });
  const namecom = await getNamecomHealth();
  const webhookUrl = `${getAppUrl()}/api/webhooks/namecom`;

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Operations"
        title="Providers"
        description="Domains and DNS use name.com. Payments stay free (mock) until you connect a real gateway."
      />

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Wholesale source</p>
            <h2 className="mt-1 text-xl font-extrabold text-[var(--navy)]">name.com Core API</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{namecom.message}</p>
          </div>
          <StatusBadge status={namecom.connected ? "CONNECTED" : namecom.configured ? "ERROR" : "DISCONNECTED"} />
        </div>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">Environment</dt>
            <dd className="font-semibold">{namecom.env ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">API host</dt>
            <dd className="font-semibold break-all">{namecom.baseUrl ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Username</dt>
            <dd className="font-semibold">{namecom.username ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Account credit</dt>
            <dd className="font-semibold">
              {namecom.balanceUsd == null ? "None" : `$${namecom.balanceUsd.toFixed(2)}`}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">name.com domains</dt>
            <dd className="font-semibold">{namecom.remoteDomains ?? "None"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Pending transfers</dt>
            <dd className="font-semibold">{namecom.pendingTransfers ?? "None"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">Unverified contacts</dt>
            <dd className="font-semibold">{namecom.unverifiedContacts ?? "None"}</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">name.com orders</dt>
            <dd className="font-semibold">{namecom.remoteOrders ?? "None"}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Search, register, renew, DNS, nameservers, lock, privacy, transfers, and pricing all go through this API.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="font-bold text-[var(--navy)]">Payment (test mode)</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          <code className="rounded bg-[#f6f8fb] px-1.5 py-0.5">PAYMENT_PROVIDER=mock</code> — checkout always
          succeeds with no card charge so you can test domain registration end-to-end. name.com still bills your
          account credit for real production registers.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {providers.map((provider) => (
          <div key={provider.id} className="card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="stat-icon">
                  <Plug className="h-4 w-4" />
                </span>
                <h2 className="font-bold">{provider.type} provider</h2>
              </div>
              <StatusBadge status={provider.status} />
            </div>
            <p className="mt-3 text-sm">{provider.name}</p>
            <p className="text-sm text-[var(--muted)]">Driver: {provider.driver}</p>
          </div>
        ))}
      </div>
      <section className="card p-5 text-sm text-[var(--muted)]">
        <SectionTitle title="Environment values" />
        <p>Keep tokens in `.env.local`. Never show them to customers.</p>
        <pre className="mt-3 overflow-auto rounded-xl bg-[#0b1220] p-4 text-white">
{`DOMAIN_PROVIDER=namecom
DNS_PROVIDER=namecom
PAYMENT_PROVIDER=mock
NAMECOM_USERNAME=
NAMECOM_API_TOKEN=
NAMECOM_ENV=sandbox
NAMECOM_WEBHOOK_URL=${webhookUrl}`}
        </pre>
      </section>
    </div>
  );
}
