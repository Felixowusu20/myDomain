import Link from "next/link";
import { Sparkles } from "lucide-react";

export function ComingSoonGate({
  children,
  title = "Coming soon",
  description = "We're focused on domain registration right now. Hosting and site deploys will open here later.",
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  return (
    <div className="coming-soon-gate">
      <div className="coming-soon-blur" aria-hidden>
        {children}
      </div>
      <div className="coming-soon-overlay">
        <div className="coming-soon-card">
          <span className="coming-soon-icon">
            <Sparkles className="h-5 w-5" />
          </span>
          <p className="coming-soon-kicker">Not available yet</p>
          <h2 className="coming-soon-title">{title}</h2>
          <p className="coming-soon-copy">{description}</p>
          <div className="coming-soon-actions">
            <Link href="/search" className="btn btn-lime">
              Find a domain
            </Link>
            <Link href="/domains" className="btn btn-ghost">
              My domains
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
