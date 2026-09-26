"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { BusyLabel } from "@/components/spinner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Something went wrong");
      return;
    }
    setInfo(data.message ?? "If that email is registered, we sent reset instructions.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Brand />
        <h1 className="mt-8 text-2xl font-extrabold text-[var(--navy)]">Reset your password</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Enter your email and we will send a reset link if the account exists.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
          {info ? <p className="text-sm font-semibold text-[var(--success)]">{info}</p> : null}
          <button className="btn btn-primary w-full" disabled={loading}>
            <BusyLabel busy={loading}>Send reset link</BusyLabel>
          </button>
        </form>
        <p className="mt-5 text-sm">
          <Link href="/login" className="font-semibold text-[var(--accent)]">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
