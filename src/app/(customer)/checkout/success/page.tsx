import Link from "next/link";
import { CheckCircle2, Globe, LayoutDashboard, Sparkles } from "lucide-react";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; id?: string }>;
}) {
  const { domain, id } = await searchParams;
  return (
    <div className="mx-auto max-w-xl py-10 text-center">
      <span className="stat-icon mx-auto h-14 w-14">
        <CheckCircle2 className="h-7 w-7 text-[var(--success)]" />
      </span>
      <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-[var(--success)]">Order complete</p>
      <h1 className="mt-3 text-4xl font-extrabold text-[var(--navy)]">{domain ?? "Your order"}</h1>
      <p className="mt-3 text-[var(--muted)]">
        Your domain is ready. Next, connect it to Vercel (or any host) with the DNS details we provide.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {id ? (
          <Link href={`/domains/${id}#connect`} className="btn btn-hot">
            <Sparkles className="h-4 w-4" />
            Connect to Vercel
          </Link>
        ) : null}
        {id ? (
          <Link href={`/domains/${id}`} className="btn btn-ghost">
            <Globe className="h-4 w-4" />
            Manage domain
          </Link>
        ) : null}
        <Link href="/dashboard" className="btn btn-ghost">
          <LayoutDashboard className="h-4 w-4" />
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
