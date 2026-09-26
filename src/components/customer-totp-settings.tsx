"use client";

import { FormEvent, useEffect, useState } from "react";
import { BusyLabel } from "@/components/spinner";
import { ShieldCheck, ShieldOff } from "lucide-react";

type Status = {
  enabled: boolean;
  enabledAt?: string | null;
  backupCodesRemaining: number;
};

type Setup = {
  secret: string;
  uri: string;
  qrDataUrl: string;
  setupToken: string;
};

export function CustomerTotpSettings() {
  const [status, setStatus] = useState<Status | null>(null);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadStatus() {
    const response = await fetch("/api/account/security/totp");
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not load 2FA status.");
      return;
    }
    setStatus(data);
  }

  useEffect(() => {
    void loadStatus();
  }, []);

  async function beginSetup() {
    setLoading(true);
    setError("");
    setInfo("");
    setBackupCodes(null);
    const response = await fetch("/api/account/security/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "begin" }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not start setup.");
      return;
    }
    setSetup(data);
    setCode("");
  }

  async function enable(event: FormEvent) {
    event.preventDefault();
    if (!setup) return;
    setLoading(true);
    setError("");
    const response = await fetch("/api/account/security/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "enable",
        secret: setup.secret,
        setupToken: setup.setupToken,
        code,
      }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not enable 2FA.");
      return;
    }
    setBackupCodes(data.backupCodes ?? []);
    setSetup(null);
    setCode("");
    setInfo("Two-factor authentication is on. Save your backup codes now.");
    await loadStatus();
  }

  async function disable(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setInfo("");
    const response = await fetch("/api/account/security/totp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "disable", code }),
    });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not disable 2FA.");
      return;
    }
    setCode("");
    setBackupCodes(null);
    setSetup(null);
    setInfo("Two-factor authentication has been turned off.");
    await loadStatus();
  }

  return (
    <section className="card max-w-lg space-y-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-bold text-[var(--navy)]">
            {status?.enabled ? (
              <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
            ) : (
              <ShieldOff className="h-4 w-4" />
            )}
            Two-factor authentication
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Require an authenticator code every time you sign in to your account.
          </p>
        </div>
        {status ? (
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              status.enabled
                ? "bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-[var(--success)]"
                : "bg-[var(--nm-panel-soft)] text-[var(--muted)]"
            }`}
          >
            {status.enabled ? "Enabled" : "Off"}
          </span>
        ) : null}
      </div>

      {status?.enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Enabled {status.enabledAt ? new Date(status.enabledAt).toLocaleString() : ""}.
            {" "}
            Backup codes left: {status.backupCodesRemaining}.
          </p>
          <form onSubmit={disable} className="flex flex-wrap items-end gap-3">
            <label className="field min-w-[12rem] flex-1">
              <span>Authenticator or backup code</span>
              <input
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                placeholder="123456"
              />
            </label>
            <button className="btn btn-ghost" disabled={loading} type="submit">
              <BusyLabel busy={loading}>Disable 2FA</BusyLabel>
            </button>
          </form>
        </div>
      ) : setup ? (
        <form onSubmit={enable} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={setup.qrDataUrl}
              alt="Authenticator QR code"
              className="mx-auto rounded-xl border border-[var(--line)] bg-white p-2"
              width={180}
              height={180}
            />
            <div className="space-y-2 text-sm">
              <p className="text-[var(--muted)]">
                Scan this QR with your authenticator app, or enter the secret manually:
              </p>
              <code className="block break-all rounded-xl border border-[var(--line)] bg-[var(--field-bg)] px-3 py-2 font-mono text-xs">
                {setup.secret}
              </code>
            </div>
          </div>
          <label className="field max-w-xs">
            <span>Enter the 6-digit code to confirm</span>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              minLength={6}
              maxLength={8}
              placeholder="123456"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-lime" disabled={loading} type="submit">
              <BusyLabel busy={loading}>Enable 2FA</BusyLabel>
            </button>
            <button
              className="btn btn-ghost"
              type="button"
              disabled={loading}
              onClick={() => {
                setSetup(null);
                setCode("");
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="btn btn-lime" disabled={loading} type="button" onClick={() => void beginSetup()}>
          <BusyLabel busy={loading}>Set up authenticator</BusyLabel>
        </button>
      )}

      {backupCodes ? (
        <div className="rounded-xl border border-[var(--line)] bg-[var(--field-bg)] p-4">
          <p className="font-bold text-[var(--navy)]">Backup codes (save these once)</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Each code works one time if you lose your authenticator.
          </p>
          <ul className="mt-3 grid gap-1 font-mono text-sm sm:grid-cols-2">
            {backupCodes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      {info ? <p className="text-sm font-semibold text-[var(--success)]">{info}</p> : null}
    </section>
  );
}
