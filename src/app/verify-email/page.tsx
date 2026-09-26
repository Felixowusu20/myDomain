"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { OtpBoxes } from "@/components/otp-boxes";
import { BusyLabel, Spinner } from "@/components/spinner";
import {
  clearSignupProgress,
  loadPendingVerification,
  savePendingVerification,
} from "@/lib/signup-progress";

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const submittedCode = useRef("");
  const queryEmail = params.get("email") ?? "";
  const [email, setEmail] = useState(queryEmail);
  const [code, setCode] = useState("");
  const [expiresAt, setExpiresAt] = useState<number | null>(() => {
    const raw = Number(params.get("expires"));
    return Number.isFinite(raw) && raw > Date.now() ? raw : null;
  });
  const [now, setNow] = useState(Date.now());
  const [error, setError] = useState("");
  const [info, setInfo] = useState(queryEmail ? "Enter the 6 digit code we emailed you." : "");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const remaining = expiresAt ? expiresAt - now : null;
  const expired = remaining !== null && remaining <= 0;
  const countdown = useMemo(
    () => (remaining === null ? null : formatRemaining(remaining)),
    [remaining],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (queryEmail) {
      const expires = params.get("expires");
      const iso = expires && Number.isFinite(Number(expires))
        ? new Date(Number(expires)).toISOString()
        : null;
      savePendingVerification(queryEmail, iso);
      return;
    }
    const pending = loadPendingVerification();
    if (!pending) return;
    setEmail(pending.email);
    if (pending.expiresAt) {
      const ms = new Date(pending.expiresAt).getTime();
      if (Number.isFinite(ms)) setExpiresAt(ms);
    }
  }, [params, queryEmail]);

  const activeEmail = email || queryEmail;

  useEffect(() => {
    if (!activeEmail) return;
    let cancelled = false;
    fetch(`/api/auth/resend-otp?email=${encodeURIComponent(activeEmail)}`)
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !data.expiresAt) return;
        setExpiresAt(new Date(data.expiresAt).getTime());
        savePendingVerification(activeEmail, data.expiresAt);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [activeEmail]);

  useEffect(() => {
    if (code.length < 6) submittedCode.current = "";
    if (code.length !== 6 || expired || loading || submittedCode.current === code) return;
    submittedCode.current = code;
    formRef.current?.requestSubmit();
  }, [code, expired, loading]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (code.length !== 6 || expired) return;
    setLoading(true);
    setError("");
    setInfo("");
    const response = await fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? "Something went wrong");
      return;
    }
    clearSignupProgress();
    router.push(data.redirectTo ?? "/dashboard");
    router.refresh();
  }

  async function resend() {
    setResending(true);
    setError("");
    setInfo("");
    const response = await fetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setResending(false);
    if (!response.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    if (data.expiresAt) {
      setExpiresAt(new Date(data.expiresAt).getTime());
      savePendingVerification(email, data.expiresAt);
    }
    setCode("");
    setInfo(data.message ?? "If that email needs verification, we sent a new code.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Brand />
        <h1 className="mt-8 text-2xl font-extrabold text-[var(--navy)]">Verify your email</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Type the 6 digit code from your email. Codes are valid for 15 minutes.
        </p>
        <form ref={formRef} onSubmit={submit} className="mt-6 space-y-4">
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <div className="field">
            <span>Verification code</span>
            <OtpBoxes value={code} onChange={setCode} disabled={loading} />
          </div>
          {countdown ? (
            <p className={`otp-timer${expired ? " is-expired" : remaining !== null && remaining < 60_000 ? " is-warning" : ""}`}>
              {expired ? "Code expired" : `Code expires in ${countdown}`}
            </p>
          ) : (
            <p className="otp-timer">Codes expire 15 minutes after they are sent.</p>
          )}
          {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
          {info ? <p className="text-sm font-semibold text-[var(--success)]">{info}</p> : null}
          <button className="btn btn-primary w-full" disabled={loading || code.length !== 6 || expired}>
            <BusyLabel busy={loading}>{expired ? "Code expired" : "Verify email"}</BusyLabel>
          </button>
        </form>
        <p className="mt-5 text-sm text-[var(--muted)]">
          Didn&apos;t get a code?{" "}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 font-semibold text-[var(--accent)]"
            onClick={resend}
            disabled={resending || !email}
          >
            {resending ? (
              <>
                <Spinner size="sm" /> Sending
              </>
            ) : (
              "Send a new one"
            )}
          </button>
        </p>
        <p className="mt-3 text-sm">
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
