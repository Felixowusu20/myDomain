import { getAdminContext } from "@/lib/page-auth";
import { getAdminHomepageCms } from "@/lib/services/cms.service";
import { CmsHomeEditor } from "@/components/cms-home-editor";
import { PageHeader } from "@/components/ui";

export default async function AdminCmsPage() {
  await getAdminContext();
  const data = await getAdminHomepageCms();
  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Content"
        title="Homepage CMS"
        description="Edit hero copy, upload images to Cloudinary, and manage partner cards shown on the marketing homepage."
      />
      <CmsHomeEditor home={data.home} stats={data.stats} partners={data.partners} />
    </div>
  );
}
