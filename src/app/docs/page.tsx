import { MarketingFooter } from "@/components/marketing-footer";
import { MarketingHeader } from "@/components/marketing-header";
import { SmsDocs } from "@/components/sms-docs";
import { getAppUrl } from "@/lib/env";
import { getPublishedSmsDocs } from "@/lib/services/docs.service";

export default async function PublicDocsPage() {
  const pages = await getPublishedSmsDocs();
  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <MarketingHeader />
      <main className="mx-auto max-w-6xl px-5 py-12">
        <p className="page-kicker">SMS & OTP</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-[var(--navy)]">SMS & OTP</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          How to send a verification code or a text message with MyDomain. Start with the list, then follow the section you need.
        </p>
        <div className="mt-10">
          <SmsDocs pages={pages} baseUrl={getAppUrl()} />
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
