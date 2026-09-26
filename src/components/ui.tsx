import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker ? <p className="page-kicker">{kicker}</p> : null}
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--navy)]">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[var(--muted)]">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
          <p className="mt-2 text-3xl font-extrabold text-[var(--navy)]">{value}</p>
          {hint ? <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{hint}</p> : null}
        </div>
        <span className="stat-icon">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="stat-icon mx-auto">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 font-extrabold text-[var(--navy)]">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({
  icon: Icon,
  title,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        {Icon ? (
          <span className="stat-icon !h-8 !w-8">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <h2 className="font-bold text-[var(--navy)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}
