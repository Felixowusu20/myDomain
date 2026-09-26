import Link from "next/link";
import { Clock } from "lucide-react";
import { trialDaysLeft } from "@/lib/services/hosting.service";
import { formatDate } from "@/lib/utils";

export function TrialHostingBanner({
  hostingId,
  trialEndsAt,
  hasDomain,
  hasDomains,
}: {
  hostingId: string;
  trialEndsAt: Date | null;
  hasDomain: boolean;
  hasDomains: boolean;
}) {
  const days = trialDaysLeft(trialEndsAt);
  const ended = !days;
  return (
    <section className="card border-[var(--accent)] p-5">
      <div className="flex items-start gap-3">
        <span className="stat-icon">
          <Clock className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-extrabold text-[var(--navy)]">
            {ended ? "Preview hosting has ended" : `${days} day${days === 1 ? "" : "s"} left on preview hosting`}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {ended
              ? "Buy a hosting plan and connect your domain to keep this GitHub project live."
              : `This live preview stays up until ${formatDate(trialEndsAt)}. After two weeks, buy hosting and connect a domain.`}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/hosting?upgrade=${hostingId}`} className="btn btn-hot">
              Buy hosting
            </Link>
            {hasDomain ? null : hasDomains ? (
              <Link href={`/hosting/${hostingId}`} className="btn btn-ghost">
                Connect a domain
              </Link>
            ) : (
              <Link href="/search" className="btn btn-ghost">
                Find a domain
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
