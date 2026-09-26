import { otpConfig, smsConfig } from "@/lib/messaging/config";
import { DocBody } from "@/components/doc-body";
import { formatDate } from "@/lib/utils";

type DocPage = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  updatedAt: Date;
};

function LimitsCard() {
  const otp = otpConfig();
  const sms = smsConfig();
  const rows = [
    ["Code length", `${otp.length} digits`],
    ["Code lifetime", `${otp.ttlSeconds} seconds`],
    ["Guesses", `${otp.maxAttempts} per code`],
    ["Resend wait", `${Math.round(otp.resendCooldownMs / 1000)} seconds`],
    ["OTP per phone", `${otp.maxPerPhone} / ${Math.round(otp.windowMs / 1000)}s`],
    ["OTP per address", `${otp.maxPerIp} / ${Math.round(otp.windowMs / 1000)}s`],
    ["OTP per project", `${otp.maxPerProject} / ${Math.round(otp.windowMs / 1000)}s`],
    ["SMS per project", `${sms.maxPerProject} / ${Math.round(sms.windowMs / 1000)}s`],
    ["SMS retries", String(sms.maxRetries)],
    ["Default sender", sms.defaultSender],
  ];
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--field-bg)] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">Current limits</p>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
        These numbers are read from the server. They change with the environment, without editing the guide.
      </p>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="text-[var(--muted)]">{label}</dt>
            <dd className="font-semibold text-[var(--navy)]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function SmsDocs({ pages, baseUrl }: { pages: DocPage[]; baseUrl: string }) {
  const origin = baseUrl.replace(/\/+$/, "");
  return (
    <div className="grid gap-8 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:items-start">
      <aside className="space-y-4 lg:sticky lg:top-6">
        <nav aria-label="On this page" className="rounded-2xl border border-[var(--line)] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">On this page</p>
          <ol className="mt-3 space-y-1">
            {pages.map((page, index) => (
              <li key={page.id}>
                <a
                  href={`#${page.slug}`}
                  className="flex gap-3 rounded-lg px-2 py-1.5 text-sm font-semibold text-[var(--navy)] hover:bg-[var(--field-bg)]"
                >
                  <span className="w-6 shrink-0 tabular-nums text-[var(--muted)]">{String(index + 1).padStart(2, "0")}</span>
                  <span>{page.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <LimitsCard />
      </aside>
      <article className="space-y-10">
        {pages.map((page) => (
          <section key={page.id} id={page.slug} className="scroll-mt-24 border-t border-[var(--line)] pt-8 first:border-t-0 first:pt-0">
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--navy)]">{page.title}</h2>
            {page.summary ? <p className="mt-2 text-base text-[var(--muted)]">{page.summary}</p> : null}
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
              Updated {formatDate(page.updatedAt)}
            </p>
            <div className="mt-4">
              <DocBody body={page.body} baseUrl={origin} />
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
