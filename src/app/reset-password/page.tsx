"use client";

import { Suspense } from "react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { PasswordField } from "@/components/password-field";
import { PasswordMeter } from "@/components/password-meter";
import { BusyLabel } from "@/components/spinner";
import { isPasswordStrongEnough } from "@/lib/password-strength";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(token ? "" : "This reset link is missing. Request a new one.");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!isPasswordStrongEnough(password)) {
      setError("Choose a stronger password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    const response = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, confirmPassword, token }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? "Something went wrong");
      return;
    }
    router.push(data.redirectTo ?? "/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Brand />
        <h1 className="mt-8 text-2xl font-extrabold text-[var(--navy)]">Choose a new password</h1>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <PasswordField
            label="New password"
            value={password}
            onChange={setPassword}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <PasswordMeter password={password} confirm={confirmPassword} />
          {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
          <button className="btn btn-primary w-full" disabled={loading || !token}>
            <BusyLabel busy={loading}>Update password</BusyLabel>
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
