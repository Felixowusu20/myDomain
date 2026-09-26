import { DomainSearch } from "@/components/domain-search";
import { CustomerShell } from "@/components/customer-shell";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { Reveal } from "@/components/reveal";
import { prisma } from "@/lib/db";
import { syncNamecomPricing } from "@/lib/providers/namecom/sync";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import { TLD_CATALOG } from "@/lib/tlds";

const FEATURED_TLDS = [".com", ".net", ".org", ".io", ".xyz", ".store", ".co", ".app", ".ai", ".dev", ".site", ".online"];

async function loadFeaturedChips() {
  try {
    const liveCount = await prisma.tldPricing.count({ where: { wholesaleCents: { gt: 0 } } });
    if (liveCount === 0) await syncNamecomPricing({ resetMargins: true });
  } catch {
    // fall back to catalog prices
  }

  const live = await prisma.tldPricing
    .findMany({
      where: { status: "Active", wholesaleCents: { gt: 0 } },
      orderBy: { tld: "asc" },
    })
    .catch(() => []);

  return FEATURED_TLDS.map((tld) => {
    const row = live.find((item) => item.tld === tld);
    const fallback = TLD_CATALOG.find((item) => item.tld === tld);
    if (!row && !fallback) return null;
    return {
      tld,
      retailCents: row?.retailCents ?? fallback!.retailCents,
      originalCents: row?.originalCents,
    };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tld?: string }>;
}) {
  const { q, tld } = await searchParams;
  const [session, chips] = await Promise.all([getSession(SESSION_COOKIE), loadFeaturedChips()]);

  const search = (
    <DomainSearch
      initialQuery={q ?? ""}
      initialTld={tld ?? ""}
      featuredTlds={chips}
      placeholder="Search for a domain name"
    />
  );

  if (session?.role === "CUSTOMER" && session.customerId) {
    const cartCount = await prisma.cartItem.count({ where: { customerId: session.customerId } });
    return (
      <CustomerShell name={session.name} email={session.email} cartCount={cartCount}>
        <div className="mx-auto max-w-6xl space-y-5">
          <div>
            <p className="page-kicker">Domains</p>
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">Find your domain</h1>
            <p className="mt-1 max-w-2xl text-[var(--muted)]">
              Search by name, then browse by category — Popular, Tech, Shop, Africa, and more.
            </p>
          </div>
          <DomainSearch
            initialQuery={q ?? ""}
            initialTld={tld ?? ""}
            featuredTlds={chips}
            placeholder="Search for a domain name"
          />
        </div>
      </CustomerShell>
    );
  }

  return (
    <div className="nm-site min-h-screen">
      <div className="nm-promo">Live search · Instant checkout · Point DNS at any host</div>
      <MarketingHeader />
      <main className="px-5 pb-16 pt-8 md:pt-10">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="nm-search-hero">
              <p className="nm-eyebrow">Domain search</p>
              <h1 className="nm-headline mt-4 max-w-3xl">
                Find a name that
                <span className="nm-accent"> fits.</span>
              </h1>
              <p className="nm-text-muted mt-4 max-w-xl text-base leading-7 md:text-lg">
                Search live availability, browse by category, and add the right extension to your cart.
              </p>
            </div>
          </Reveal>
          <Reveal delayMs={120}>
            <div className="mt-8 md:mt-10">{search}</div>
          </Reveal>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
