export const SMS_STATUSES = [
  "QUEUED",
  "PROCESSING",
  "SENT",
  "DELIVERED",
  "FAILED",
  "EXPIRED",
  "REJECTED",
] as const;

export type SmsStatus = (typeof SMS_STATUSES)[number];

const transitions: Record<SmsStatus, SmsStatus[]> = {
  QUEUED: ["PROCESSING"],
  PROCESSING: ["SENT", "DELIVERED", "FAILED", "REJECTED", "EXPIRED", "QUEUED"],
  SENT: ["DELIVERED", "FAILED", "EXPIRED", "REJECTED"],
  DELIVERED: [],
  FAILED: [],
  EXPIRED: [],
  REJECTED: [],
};

export function canTransition(from: string, to: string) {
  if (!isSmsStatus(from) || !isSmsStatus(to)) return false;
  return transitions[from].includes(to);
}

export function isSmsStatus(value: string): value is SmsStatus {
  return (SMS_STATUSES as readonly string[]).includes(value);
}

export function publicStatus(status: string) {
  return status.toLowerCase();
}

/** Delay before the next attempt. Caps at 10 minutes. Attempt 1 waits 15s. */
export function retryDelayMs(retryCount: number) {
  const exponent = Math.max(0, retryCount - 1);
  return Math.min(15_000 * 2 ** exponent, 10 * 60_000);
}
