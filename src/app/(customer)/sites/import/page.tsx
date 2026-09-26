import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { getCustomerContext } from "@/lib/page-auth";
import { GithubImportForm } from "@/components/github-import-form";
import { PageHeader } from "@/components/ui";
import { getGithubConnection } from "@/lib/services/github.service";
import { GithubAuthButton } from "@/components/github-auth-button";

export default async function ImportSitePage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string; error?: string }>;
}) {
  const { user } = await getCustomerContext();
  const { repo } = await searchParams;
  if (!repo) notFound();
  const github = await getGithubConnection(user.id);

  return (
    <div className="space-y-5">
      <Link href="/sites" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--muted)]">
        <ArrowLeft className="h-4 w-4" />
        All repositories
      </Link>
      <PageHeader
        kicker="Import"
        title={repo}
        description="Configure the project, wait for GitHub checks, then deploy to 14-day preview hosting."
      />
      {github.connected ? (
        <GithubImportForm repo={repo} />
      ) : (
        <div className="card max-w-md space-y-3 p-5">
          <p className="text-sm text-[var(--muted)]">Connect GitHub to inspect and deploy this repository.</p>
          <GithubAuthButton intent="connect" next={`/sites/import?repo=${encodeURIComponent(repo)}`} />
        </div>
      )}
    </div>
  );
}
