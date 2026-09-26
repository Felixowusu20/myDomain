import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { PricingEditor } from "@/components/pricing-editor";
import { AdminSyncButton } from "@/components/admin-sync-button";
import { EmptyState, PageHeader } from "@/components/ui";
import { syncNamecomPricing } from "@/lib/providers/namecom/sync";
import { Tag } from "lucide-react";

export default async function AdminPricingPage() {
  await getAdminContext();
  let syncError = "";
  try {
    const liveCount = await prisma.tldPricing.count({ where: { wholesaleCents: { gt: 0 } } });
    if (liveCount === 0) await syncNamecomPricing({ resetMargins: true });
  } catch (error) {
    syncError = error instanceof Error ? error.message : "Could not pull name.com pricing.";
  }
  const pricing = await prisma.tldPricing.findMany({
    where: { wholesaleCents: { gt: 0 } },
    orderBy: { wholesaleCents: "asc" },
  });
  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Products"
        title="Pricing"
        description="Your cost is what name.com charges you. Set your sell price only when you want a margin."
        actions={
          <div className="flex flex-wrap gap-2">
            <AdminSyncButton path="/api/admin/pricing/sync" label="Refresh costs" />
            <AdminSyncButton
              path="/api/admin/pricing/sync"
              label="Reset sell prices to cost"
              body={{ resetMargins: true }}
            />
          </div>
        }
      />
      <div className="rounded-2xl border border-[var(--line)] bg-[#f6f8fb] px-4 py-3 text-sm text-[var(--muted)]">
        Checkout payments are still <strong className="text-[var(--navy)]">free (mock)</strong> for testing.
        Real money is only deducted from your name.com account credit when a domain actually registers.
      </div>
      {syncError ? <p className="text-sm font-semibold text-[var(--danger)]">{syncError}</p> : null}
      {pricing.length ? (
        <PricingEditor
          rows={pricing.map((row) => ({
            id: row.id,
            tld: row.tld,
            wholesaleCents: row.wholesaleCents,
            originalCents: row.originalCents,
            namecomRetailCents: row.namecomRetailCents,
            retailCents: row.retailCents,
            renewalCents: row.renewalCents,
            transferCents: row.transferCents,
            status: row.status,
          }))}
        />
      ) : (
        <div className="card">
          <EmptyState
            icon={Tag}
            title="No live TLD prices yet"
            body="Pull pricing from name.com to see your real registration costs."
          />
        </div>
      )}
    </div>
  );
}
