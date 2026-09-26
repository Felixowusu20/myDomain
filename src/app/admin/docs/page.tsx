import Link from "next/link";
import { getAdminContext } from "@/lib/page-auth";
import { getAdminSmsDocs } from "@/lib/services/docs.service";
import { SmsDocsEditor } from "@/components/sms-docs-editor";
import { PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export default async function AdminDocsPage() {
  await getAdminContext();
  const pages = await getAdminSmsDocs();
  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Content"
        title="SMS & OTP docs"
        description="These sections are the public guide at /docs and the copy inside a customer’s SMS & OTP page. Saving a section publishes it immediately."
        actions={
          <Link href="/docs" className="btn btn-ghost">
            View public guide
          </Link>
        }
      />
      <SmsDocsEditor
        pages={pages.map((page) => ({
          id: page.id,
          slug: page.slug,
          title: page.title,
          summary: page.summary,
          body: page.body,
          sortOrder: page.sortOrder,
          published: page.published,
          updatedLabel: formatDate(page.updatedAt),
        }))}
      />
    </div>
  );
}
