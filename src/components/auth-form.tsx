"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Brand } from "@/components/brand";
import { MarketingHeader } from "@/components/marketing-header";
import { PasswordField } from "@/components/password-field";
import { PasswordMeter } from "@/components/password-meter";
import { BusyLabel } from "@/components/spinner";
import { PhoneInput } from "@/components/phone-input";
import { GithubAuthButton } from "@/components/github-auth-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { isPasswordStrongEnough } from "@/lib/password-strength";
import {
  clearSignupProgress,
  loadPendingVerification,
  loadSignupDraft,
  pendingVerifyPath,
  savePendingVerification,
  saveSignupDraft,
} from "@/lib/signup-progress";

const oauthErrors: Record<string, string> = {
  auth: "That sign in link is invalid or expired.",
  github: "GitHub sign-in failed. Try again.",
  github_denied: "GitHub access was cancelled.",
  github_email:
    "GitHub did not share a verified email. Make an email public or verified on GitHub, then try again.",
  github_exists: "This GitHub account is already connected to another user.",
  github_admin: "Admin accounts sign in from the admin page.",
  github_config: "GitHub sign-in is not configured yet.",
  github_rate: "Too many attempts. Please wait a moment.",
};

const DEFAULT_SIDE_IMAGE =
  "https://images.unsplash.com/photo-1483728642387-6c3bddfcdc0d?auto=format&fit=crop&w=1400&q=80";

export function AuthForm({
  mode,
  admin = false,
  githubEnabled = false,
  sideImageUrl = DEFAULT_SIDE_IMAGE,
}: {
  mode: "login" | "register";
  admin?: boolean;
  githubEnabled?: boolean;
  sideImageUrl?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { theme } = useTheme();
  const brandLight = theme === "dark";
  const next = params.get("next") || (admin ? "/admin" : "/dashboard");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(oauthErrors[params.get("error") ?? ""] ?? "");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasAdmin, setHasAdmin] = useState(true);
  const [ready, setReady] = useState(mode !== "register");
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [totpPendingToken, setTotpPendingToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const githubTotpStep = !admin && params.get("step") === "2fa";
  const showTotpChallenge = Boolean(totpPendingToken) || githubTotpStep;

  useEffect(() => {
    if (admin) return;
    const pending = loadPendingVerification();
    if (mode === "register" && pending) {
      router.replace(pendingVerifyPath(pending));
      return;
    }
    if (mode === "register") {
      const draft = loadSignupDraft();
      if (draft) {
        setName(draft.name);
        setEmail(draft.email);
        setPhone(draft.phone);
      }
      setReady(true);
    }
    if (mode === "login" && pending) {
      setPendingPath(pendingVerifyPath(pending));
    }
  }, [admin, mode, router]);

  useEffect(() => {
    if (mode !== "register" || !ready) return;
    saveSignupDraft({ name, email, phone });
  }, [mode, ready, name, email, phone]);

  useEffect(() => {
    if (!admin) return;
    fetch("/api/auth/bootstrap-admin")
      .then((response) => response.json())
      .then((data) => setHasAdmin(Boolean(data.hasAdmin)))
      .catch(() => setHasAdmin(true));
  }, [admin]);

  const bootstrap = admin && mode === "login" && !hasAdmin;
  const needsConfirm = mode === "register" || bootstrap;
  const socialEnabled = !admin && githubEnabled;

  async function submitTotp(event: FormEvent) {
    event.preventDefault();
    if (!totpPendingToken && params.get("step") !== "2fa") return;
    setLoading(true);
    setError("");
    setInfo("");
    const endpoint = admin ? "/api/auth/admin/totp" : "/api/auth/customer/totp";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(totpPendingToken ? { pendingToken: totpPendingToken } : {}),
        code: totpCode,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? "Invalid authenticator code.");
      return;
    }
    router.push(data.redirectTo ?? next);
    router.refresh();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "register" && !phone.trim()) {
      setError("Enter your phone number.");
      return;
    }
    if (needsConfirm && !isPasswordStrongEnough(password)) {
      setError("Choose a stronger password.");
      return;
    }
    if (needsConfirm && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    const endpoint = bootstrap
      ? "/api/auth/bootstrap-admin"
      : mode === "login"
        ? "/api/auth/login"
        : "/api/auth/register";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        confirmPassword,
        phone,
        portal: admin ? "admin" : "customer",
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setLoading(false);
      setError(data.error ?? "Something went wrong");
      return;
    }
    if (data.needsTotp && data.pendingToken) {
      setTotpPendingToken(data.pendingToken);
      setTotpCode("");
      setInfo(data.message ?? "Enter the 6-digit code from your authenticator app.");
      setLoading(false);
      return;
    }
    if (data.needsVerification || String(data.redirectTo ?? "").startsWith("/verify-email")) {
      savePendingVerification(email, data.expiresAt ?? null);
    } else {
      clearSignupProgress();
    }
    if (data.message && data.redirectTo === "/login") {
      setInfo(data.message);
      setLoading(false);
      return;
    }
    router.push(data.redirectTo ?? next);
    router.refresh();
  }

  if (admin) {
    return (
      <div className="nm-site auth-page min-h-screen">
        <header className="nm-header">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
            <Link href="/" aria-label="myDomain home">
              <Brand light={brandLight} />
            </Link>
            <div className="flex items-center gap-3">
              <ThemeToggle compact />
              <span className="rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--nm-muted)]" style={{ borderColor: "var(--nm-border)" }}>
                Admin
              </span>
              <Link href="/login" className="nm-link text-sm font-semibold">
                Customer login
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-14">
          <div className="mx-auto w-full max-w-md lg:mx-0">
            <p className="nm-eyebrow">Control panel</p>
            <h1 className="nm-text mt-4 text-3xl font-extrabold tracking-tight md:text-4xl">
              {bootstrap
                ? "Create the first admin."
                : showTotpChallenge
                  ? "Two-factor authentication."
                  : "Admin sign in."}
            </h1>
            <p className="nm-text-muted mt-3 text-sm leading-6">
              {bootstrap
                ? "No administrator exists yet. We will email a 6-digit code to verify this account before admin access is unlocked."
                : showTotpChallenge
                  ? "Enter the 6-digit code from your authenticator app, or a one-time backup code."
                  : "Manage customers, domains, pricing, and providers from one place."}
            </p>

            {showTotpChallenge ? (
              <form onSubmit={submitTotp} className="mt-8 space-y-4">
                <label className="field auth-field">
                  <span>Authenticator code</span>
                  <input
                    value={totpCode}
                    onChange={(event) => setTotpCode(event.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    minLength={6}
                    maxLength={24}
                    placeholder="123456"
                  />
                </label>
                {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}
                {info ? <p className="text-sm font-semibold text-[var(--lime)]">{info}</p> : null}
                <button className="btn-auth-primary" disabled={loading} type="submit">
                  <BusyLabel busy={loading}>Verify and continue</BusyLabel>
                  {!loading ? (
                    <span className="btn-auth-arrow" aria-hidden>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="nm-link text-sm font-semibold"
                  disabled={loading}
                  onClick={() => {
                    setTotpPendingToken(null);
                    setTotpCode("");
                    setError("");
                    setInfo("");
                  }}
                >
                  Back to password
                </button>
              </form>
            ) : (
              <form onSubmit={submit} className="mt-8 space-y-4">
                {bootstrap ? (
                  <label className="field auth-field">
                    <span>Name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} required />
                  </label>
                ) : null}
                <label className="field auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="username"
                  />
                </label>
                <PasswordField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={needsConfirm ? 8 : 6}
                  autoComplete={bootstrap ? "new-password" : "current-password"}
                />
                {needsConfirm ? (
                  <>
                    <PasswordField
                      label="Confirm password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <PasswordMeter password={password} confirm={confirmPassword} />
                  </>
                ) : null}
                {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}
                {info ? <p className="text-sm font-semibold text-[var(--lime)]">{info}</p> : null}
                <button className="btn-auth-primary" disabled={loading} type="submit">
                  <BusyLabel busy={loading}>
                    {bootstrap ? "Create admin account" : "Log in"}
                  </BusyLabel>
                  {!loading ? (
                    <span className="btn-auth-arrow" aria-hidden>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </button>
              </form>
            )}

            <p className="nm-text-faint mt-6 text-sm">
              Looking for the customer portal?{" "}
              <Link href="/login" className="font-semibold text-[var(--lime)] hover:underline">
                Sign in here
              </Link>
            </p>
          </div>

          <div className="relative mx-auto hidden w-full max-w-xl lg:block">
            <div className="auth-side-art auth-side-art-admin">
              <Image
                src={sideImageUrl || DEFAULT_SIDE_IMAGE}
                alt=""
                fill
                className="object-cover"
                sizes="(min-width: 1024px) 560px, 100vw"
                priority
              />
              <div className="auth-side-overlay" />
              <div className="auth-admin-badge">
                <span>Domains</span>
                <span>Pricing</span>
                <span>Providers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="nm-site auth-page min-h-screen">
      <MarketingHeader />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 lg:grid-cols-2 lg:items-center lg:gap-14 lg:py-14">
        <div className="mx-auto w-full max-w-md lg:mx-0">
          <h1 className="nm-text text-3xl font-extrabold tracking-tight md:text-4xl">
            {mode === "login" ? "Good to see you again." : "Create your account."}
          </h1>
          <p className="nm-text-muted mt-3 text-sm">
            {mode === "login" ? (
              <>
                Need an account?{" "}
                <Link href="/register" className="font-semibold text-[var(--lime)] hover:underline">
                  Create one
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-[var(--lime)] hover:underline">
                  Log in
                </Link>
              </>
            )}
          </p>

          {mode === "login" && pendingPath ? (
            <p className="mt-4 rounded-xl border px-3 py-2 text-sm text-[var(--nm-fg)]" style={{ borderColor: "var(--nm-border)", background: "var(--nm-panel-soft)" }}>
              Your signup is still in progress.{" "}
              <Link href={pendingPath} className="font-semibold text-[var(--lime)]">
                Continue verification
              </Link>
            </p>
          ) : null}

          {showTotpChallenge ? (
            <form onSubmit={submitTotp} className="mt-8 space-y-4">
              <p className="text-sm text-[var(--nm-muted)]">
                Enter the 6-digit code from your authenticator app, or a one-time backup code.
              </p>
              <label className="field auth-field">
                <span>Authenticator code</span>
                <input
                  value={totpCode}
                  onChange={(event) => setTotpCode(event.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  minLength={6}
                  maxLength={24}
                  placeholder="123456"
                />
              </label>
              {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}
              {info ? <p className="text-sm font-semibold text-[var(--lime)]">{info}</p> : null}
              <button className="btn-auth-primary" disabled={loading} type="submit">
                <BusyLabel busy={loading}>Verify and continue</BusyLabel>
                {!loading ? (
                  <span className="btn-auth-arrow" aria-hidden>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                className="nm-link text-sm font-semibold"
                disabled={loading}
                  onClick={() => {
                    setTotpPendingToken(null);
                    setTotpCode("");
                    setError("");
                    setInfo("");
                    if (githubTotpStep) router.replace("/login");
                  }}
                >
                  Back to password
                </button>
              </form>
            ) : mode === "register" && !ready ? (
            <p className="nm-text-muted mt-6 text-sm">Continuing your signup</p>
          ) : (
            <>
              {socialEnabled ? (
                <div className="mt-8 space-y-3">
                  <GithubAuthButton intent="login" next={next} label="Continue with GitHub" />
                  <div className="auth-divider">
                    <span>or</span>
                  </div>
                </div>
              ) : null}

              <form
                onSubmit={submit}
                className={socialEnabled ? "space-y-4" : "mt-8 space-y-4"}
              >
                {mode === "register" ? (
                  <label className="field auth-field">
                    <span>Name</span>
                    <input value={name} onChange={(event) => setName(event.target.value)} required />
                  </label>
                ) : null}
                <label className="field auth-field">
                  <span>{mode === "login" ? "Username" : "Email"}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="username"
                  />
                </label>
                {mode === "register" ? <PhoneInput value={phone} onChange={setPhone} /> : null}
                <PasswordField
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  required
                  minLength={needsConfirm ? 8 : 6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                {needsConfirm ? (
                  <>
                    <PasswordField
                      label="Confirm password"
                      value={confirmPassword}
                      onChange={setConfirmPassword}
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    <PasswordMeter password={password} confirm={confirmPassword} />
                  </>
                ) : null}
                {mode === "login" ? (
                  <p className="text-sm">
                    <Link
                      href="/forgot-password"
                      className="font-semibold text-[var(--lime)] hover:underline"
                    >
                      Forgot Username or Password?
                    </Link>
                  </p>
                ) : null}
                {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}
                {info ? <p className="text-sm font-semibold text-[var(--lime)]">{info}</p> : null}
                <button className="btn-auth-primary" disabled={loading} type="submit">
                  <BusyLabel busy={loading}>{mode === "login" ? "Log in" : "Create account"}</BusyLabel>
                  {!loading ? (
                    <span className="btn-auth-arrow" aria-hidden>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="relative mx-auto hidden w-full max-w-xl lg:block">
          <div className="auth-side-art">
            <Image
              src={sideImageUrl || DEFAULT_SIDE_IMAGE}
              alt=""
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 560px, 100vw"
              priority
            />
            <div className="auth-side-overlay" />
            <div className="auth-tld-tags">
              <span>.world</span>
              <span>.guide</span>
              <span>.cool</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
