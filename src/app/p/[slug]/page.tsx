import { notFound, redirect } from "next/navigation";
import { getPublicPreview, trialDaysLeft } from "@/lib/services/hosting.service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getPublicPreview(slug);
  return { title: site?.githubRepo ?? "Preview site" };
}

export default async function PreviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await getPublicPreview(slug);
  if (!site) notFound();

  const expired =
    site.status === "SUSPENDED" ||
    site.status === "TERMINATED" ||
    (site.isTrial && trialDaysLeft(site.trialEndsAt) === 0);
  if (expired) redirect(`/hosting/${site.id}`);

  if (site.runtimeMode === "server" && site.previewUrl) {
    redirect(site.previewUrl);
  }
  redirect(`/p/${site.previewSlug}/site`);
}
