const styles: Record<string, { bg: string; color: string; label?: string }> = {
  ACTIVE: { bg: "#e8f8f1", color: "#0b8f62" },
  RUNNING: { bg: "#e8f8f1", color: "#0b8f62" },
  CONNECTED: { bg: "#e8f8f1", color: "#0b8f62" },
  DISCONNECTED: { bg: "#eef1f5", color: "#5b6b80" },
  IDLE: { bg: "#eef1f5", color: "#5b6b80" },
  SUCCESS: { bg: "#e8f8f1", color: "#0b8f62" },
  PAID: { bg: "#e8f8f1", color: "#0b8f62" },
  COMPLETED: { bg: "#e8f8f1", color: "#0b8f62" },
  Healthy: { bg: "#e8f8f1", color: "#0b8f62" },
  WARNING: { bg: "#fff4e5", color: "#c67a10" },
  SENT: { bg: "#e8f8f1", color: "#0b8f62" },
  DELIVERED: { bg: "#e8f8f1", color: "#0b8f62" },
  VERIFIED: { bg: "#e8f8f1", color: "#0b8f62" },
  QUEUED: { bg: "#fff4e5", color: "#c67a10" },
  REJECTED: { bg: "#fdecec", color: "#c4413a" },
  REVOKED: { bg: "#eef1f5", color: "#5b6b80" },
  DISABLED: { bg: "#eef1f5", color: "#5b6b80" },
  INVALIDATED: { bg: "#eef1f5", color: "#5b6b80" },
  PENDING: { bg: "#fff4e5", color: "#c67a10" },
  PENDING_REGISTRATION: { bg: "#fff4e5", color: "#c67a10", label: "Pending" },
  PENDING_TRANSFER: { bg: "#fff4e5", color: "#c67a10", label: "Transfer" },
  LIVE: { bg: "#e8f8f1", color: "#0b8f62" },
  TRIAL: { bg: "#eef5ff", color: "#1d6fe9" },
  DEPLOYING: { bg: "#eef5ff", color: "#1d6fe9" },
  BUILDING: { bg: "#eef5ff", color: "#1d6fe9", label: "building" },
  PROVISIONING: { bg: "#eef5ff", color: "#1d6fe9" },
  PROCESSING: { bg: "#eef5ff", color: "#1d6fe9" },
  UPCOMING: { bg: "#eef5ff", color: "#1d6fe9" },
  EXPIRED: { bg: "#fdecec", color: "#c4413a" },
  FAILED: { bg: "#fdecec", color: "#c4413a" },
  ERROR: { bg: "#fdecec", color: "#c4413a" },
  SUSPENDED: { bg: "#fdecec", color: "#c4413a" },
  OFFLINE: { bg: "#fdecec", color: "#c4413a" },
  TERMINATED: { bg: "#eef1f5", color: "#5b6b80" },
  LOCKED: { bg: "#eef1f5", color: "#5b6b80" },
  MAINTENANCE: { bg: "#fff4e5", color: "#c67a10" },
};

export function StatusBadge({ status }: { status: string }) {
  const style = styles[status] ?? { bg: "#eef1f5", color: "#5b6b80" };
  const label = style.label ?? status.replaceAll("_", " ").toLowerCase();
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize"
      style={{ background: style.bg, color: style.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.color }} />
      {label}
    </span>
  );
}

export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold text-[var(--muted)]">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className={`meter ${value >= 75 ? "warn" : ""}`}>
        <span style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}
