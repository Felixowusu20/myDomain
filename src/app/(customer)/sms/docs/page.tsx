import { DeveloperNav } from "@/components/developer-nav";
import { SmsDocs } from "@/components/sms-docs";
import { PageHeader } from "@/components/ui";
import { getAppUrl } from "@/lib/env";
import { getCustomerContext } from "@/lib/page-auth";
import { getPublishedSmsDocs } from "@/lib/services/docs.service";

export default async function SmsDocsPage() {
  await getCustomerContext();
  const pages = await getPublishedSmsDocs();
  return (
    <div className="space-y-5">
      <PageHeader
        kicker="SMS & OTP"
        title="Documentation"
        description="The same guide is public at /docs, so you can share it before someone signs in."
      />
      <DeveloperNav />
      <SmsDocs pages={pages} baseUrl={getAppUrl()} />
    </div>
  );
}
