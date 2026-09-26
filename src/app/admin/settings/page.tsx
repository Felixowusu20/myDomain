import { Settings, Shield } from "lucide-react";
import { prisma } from "@/lib/db";
import { getAdminContext } from "@/lib/page-auth";
import { RunJobsButton } from "@/components/run-jobs-button";
import { AdminTotpSettings } from "@/components/admin-totp-settings";
import { PageHeader, SectionTitle } from "@/components/ui";

export default async function AdminSettingsPage() {
  await getAdminContext();
  const jobs = await prisma.backgroundJob.findMany();
  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Operations"
        title="Settings"
        description="Security and background jobs for expirations, renewals, and provider sync."
      />
      <AdminTotpSettings />
      <section className="card p-5">
        <SectionTitle icon={Settings} title="Background jobs" />
        <p className="text-sm text-[var(--muted)]">
          Run expiration checks, renewal reminders, and name.com inventory sync.
        </p>
        <div className="mt-4 space-y-2">
          {jobs.map((job) => (
            <p key={job.id} className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm">
              <span className="font-semibold">{job.name}</span>
              {" · "}
              {job.status} · last run {job.lastRunAt?.toLocaleString() ?? "never"}
            </p>
          ))}
        </div>
        <div className="mt-4">
          <RunJobsButton />
        </div>
      </section>
      <p className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <Shield className="h-3.5 w-3.5" />
        Tip: enable 2FA before using live name.com credentials in production.
      </p>
    </div>
  );
}
