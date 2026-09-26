import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { DomainSearch } from "@/components/domain-search";
import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { Reveal } from "@/components/reveal";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/utils";
import { syncNamecomPricing } from "@/lib/providers/namecom/sync";
import { getHomepageCms } from "@/lib/services/cms.service";

const featuredTlds = [".com", ".net", ".org", ".io", ".xyz", ".store", ".co", ".app"];

export default async function HomePage() {
  try {
    const liveCount = await prisma.tldPricing.count({ where: { wholesaleCents: { gt: 0 } } });
    if (liveCount === 0) await syncNamecomPricing({ resetMargins: true });
  } catch {
    // homepage still renders without live chips if name.com is unreachable
  }

  const [{ home, stats, partners }, live] = await Promise.all([
    getHomepageCms(),
    prisma.tldPricing.findMany({
      where: { status: "Active", wholesaleCents: { gt: 0 } },
      orderBy: { tld: "asc" },
    }),
  ]);

  const chips = featuredTlds
    .map((tld) => live.find((item) => item.tld === tld))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      tld: item.tld,
      retailCents: item.retailCents,
      originalCents: item.originalCents,
    }));

  return (
    <div className="nm-site min-h-screen">
      <div className="nm-promo">
        Search live extensions · Buy a domain · Point it at any host
      </div>
      <MarketingHeader />

      <main>
        <section id="search" className="px-5 pb-10 pt-6 md:pt-8">
          <div className="nm-hero mx-auto max-w-6xl overflow-hidden">
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
              <div className="flex flex-col justify-center px-6 py-10 md:px-10 md:py-14">
                <Reveal>
                  <p className="nm-eyebrow">{home.eyebrow}</p>
                </Reveal>
                <Reveal delayMs={80}>
                  <h1 className="nm-headline mt-5">
                    {home.headline}
                    <span className="nm-accent">{home.headlineAccent || "."}</span>
                  </h1>
                </Reveal>
                <Reveal delayMs={140}>
                  <p className="mt-4 max-w-md text-base leading-7 nm-text-muted md:text-lg">{home.subcopy}</p>
                </Reveal>
                <Reveal delayMs={200}>
                  <div className="mt-8">
                    <DomainSearch
                      variant="hero"
                      featuredTlds={chips}
                      placeholder={home.searchPlaceholder}
                    />
                  </div>
                </Reveal>
              </div>

              <Reveal delayMs={160} className="relative min-h-[320px] lg:min-h-full">
                <div className="nm-hero-media absolute inset-0">
                  {home.heroImageUrl ? (
                    <Image
                      src={home.heroImageUrl}
                      alt=""
                      fill
                      priority
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 46vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-[#1a1a1a]" />
                  )}
                  <div className="nm-hero-fade" />
                  <div className="nm-float-stack">
                    {chips.slice(0, 3).map((item) => (
                      <span key={item.tld} className="nm-float-chip">
                        {item.tld}
                      </span>
                    ))}
                  </div>
                  {home.heroCaption ? (
                    home.heroCaptionHref ? (
                      <Link href={home.heroCaptionHref} className="nm-hero-caption">
                        {home.heroCaption}
                      </Link>
                    ) : (
                      <span className="nm-hero-caption">{home.heroCaption}</span>
                    )
                  ) : null}
                </div>
              </Reveal>
            </div>

            <div className="nm-stats grid grid-cols-2 gap-4 border-t border-white/10 px-6 py-6 md:grid-cols-4 md:px-10">
              {stats.map((stat, index) => (
                <Reveal key={`${stat.value}-${stat.label}`} delayMs={80 * index}>
                  <p className="text-2xl font-extrabold tracking-tight nm-text md:text-3xl">{stat.value}</p>
                  <p className="mt-1 text-sm nm-text-faint">{stat.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="partners" className="px-5 py-16 md:py-20">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <h2 className="mx-auto max-w-3xl text-center text-3xl font-extrabold tracking-tight nm-text md:text-5xl">
                {home.partnersTitle}
              </h2>
            </Reveal>
            {home.partnersSubcopy ? (
              <Reveal delayMs={100}>
                <p className="mx-auto mt-4 max-w-2xl text-center text-base nm-text-muted">
                  {home.partnersSubcopy}
                </p>
              </Reveal>
            ) : null}
            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {partners.map((card, index) => (
                <Reveal key={card.id} delayMs={90 * index}>
                  <article className="nm-partner-card group">
                    <div className="flex items-start justify-between gap-3">
                      <span className="nm-partner-tag">{card.tag}</span>
                      <ArrowUpRight className="h-4 w-4 nm-text-faint transition group-hover:text-[var(--lime)]" />
                    </div>
                    <h3 className="mt-5 text-xl font-extrabold nm-text">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 nm-text-muted">{card.description}</p>
                    <div className="nm-partner-media relative mt-6">
                      <Image
                        src={card.imageUrl}
                        alt=""
                        fill
                        className="object-cover transition duration-700 group-hover:scale-[1.04]"
                        sizes="(max-width: 640px) 100vw, 25vw"
                      />
                    </div>
                    {card.comingSoon ? (
                      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] nm-text-faint">Coming soon</p>
                    ) : card.href ? (
                      <Link href={card.href} className="mt-4 inline-flex text-sm font-semibold text-[var(--lime)]">
                        Learn more
                      </Link>
                    ) : null}
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="sms" className="px-5 pb-16">
          <Reveal>
            <div className="nm-connect mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-14">
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--lime)]">SMS &amp; OTP</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight nm-text md:text-4xl">
                Send a verification code, or send a text.
              </h2>
              <p className="mt-4 max-w-2xl leading-7 nm-text-muted">
                SMS &amp; OTP is MyDomain’s messaging product. OTP is a one-time code you send when an app needs to
                confirm a phone number. SMS is a normal text, such as an order update or a reminder. You create a
                project, copy an API key, and call MyDomain. Every send shows up in your account.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/docs" className="btn btn-lime">
                  See how it works
                </Link>
                <Link href="/sms" className="btn btn-ghost-dark">
                  Open SMS &amp; OTP
                </Link>
              </div>
            </div>
          </Reveal>
        </section>

        <section id="connect" className="px-5 pb-20">
          <Reveal>
            <div className="nm-connect mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-14">
              <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--lime)]">After you buy</p>
                  <h2 className="mt-3 text-3xl font-extrabold tracking-tight nm-text md:text-4xl">
                    Point your domain at any host.
                  </h2>
                  <p className="mt-4 max-w-xl nm-text-muted">
                    Keep DNS here and add the A or CNAME records your host asks for — Vercel, Netlify, Cloudflare,
                    cPanel, or wherever your site already runs.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link href="/search" className="btn btn-lime">
                      Find a domain
                    </Link>
                    <Link href="/register" className="btn btn-ghost-dark">
                      Create account
                    </Link>
                  </div>
                </div>
                <div className="grid gap-3">
                  {chips.slice(0, 4).map((item) => (
                    <div key={item.tld} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="font-bold nm-text">{item.tld}</span>
                      <span className="text-sm font-semibold nm-text-muted">{formatUsd(item.retailCents)}/yr</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
