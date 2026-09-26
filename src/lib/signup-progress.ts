const DRAFT_KEY = "mydomain_signup_draft";
const PENDING_KEY = "mydomain_signup_pending";

export type SignupDraft = {
  name: string;
  email: string;
  phone: string;
};

export type PendingVerification = {
  email: string;
  expiresAt: string | null;
  step: "verify";
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadSignupDraft(): SignupDraft | null {
  const draft = readJson<SignupDraft>(DRAFT_KEY);
  if (!draft) return null;
  return {
    name: draft.name ?? "",
    email: draft.email ?? "",
    phone: draft.phone ?? "",
  };
}

export function saveSignupDraft(draft: SignupDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadPendingVerification(): PendingVerification | null {
  const pending = readJson<PendingVerification>(PENDING_KEY);
  if (!pending?.email) return null;
  return {
    email: pending.email,
    expiresAt: pending.expiresAt ?? null,
    step: "verify",
  };
}

export function savePendingVerification(email: string, expiresAt?: string | null) {
  if (typeof window === "undefined") return;
  const pending: PendingVerification = {
    email: email.trim().toLowerCase(),
    expiresAt: expiresAt ?? null,
    step: "verify",
  };
  window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function pendingVerifyPath(pending: PendingVerification) {
  const params = new URLSearchParams({ email: pending.email });
  if (pending.expiresAt) {
    const ms = new Date(pending.expiresAt).getTime();
    if (Number.isFinite(ms)) params.set("expires", String(ms));
  }
  return `/verify-email?${params.toString()}`;
}

export function clearSignupProgress() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
  window.localStorage.removeItem(PENDING_KEY);
}
