"use client";

import { FormEvent, useState } from "react";
import { PasswordField } from "@/components/password-field";
import { PasswordMeter } from "@/components/password-meter";
import { BusyLabel } from "@/components/spinner";
import { PhoneInput } from "@/components/phone-input";
import { isPasswordStrongEnough } from "@/lib/password-strength";

export function AccountForm({
  name,
  email,
  phone,
  avatarUrl,
}: {
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
}) {
  const [form, setForm] = useState({ name, phone, password: "", confirmPassword: "" });
  const [preview, setPreview] = useState(avatarUrl ?? "");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.password) {
      if (!isPasswordStrongEnough(form.password)) {
        setError("Choose a stronger password.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }
    setError("");
    setSaving(true);
    try {
      const response = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          password: form.password || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not save your account.");
        return;
      }
      setSaved("Saved.");
      setForm({ ...form, password: "", confirmPassword: "" });
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    setError("");
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/api/account/avatar", { method: "POST", body });
    const data = await response.json();
    setUploading(false);
    if (!response.ok) {
      setError(data.error ?? "Could not upload that image.");
      return;
    }
    setPreview(data.avatarUrl);
    setSaved("Photo updated.");
  }

  return (
    <form onSubmit={submit} className="card max-w-lg space-y-3 p-5">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 overflow-hidden rounded-full bg-[var(--paper)] ring-1 ring-[var(--line)]">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-bold text-[var(--muted)]">
              {name.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <label className="btn btn-ghost cursor-pointer text-sm">
          <BusyLabel busy={uploading} busyText="Uploading">Change photo</BusyLabel>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadAvatar(file);
            }}
          />
        </label>
      </div>
      <label className="field">
        <span>Name</span>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      </label>
      <label className="field">
        <span>Email</span>
        <input value={email} disabled />
      </label>
      <PhoneInput
        value={form.phone}
        onChange={(phoneValue) => setForm({ ...form, phone: phoneValue })}
      />
      <PasswordField
        label="New password"
        value={form.password}
        onChange={(password) => setForm({ ...form, password })}
        minLength={8}
        autoComplete="new-password"
      />
      <PasswordField
        label="Confirm password"
        value={form.confirmPassword}
        onChange={(confirmPassword) => setForm({ ...form, confirmPassword })}
        minLength={8}
        autoComplete="new-password"
      />
      <PasswordMeter password={form.password} confirm={form.confirmPassword} />
      {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
      {saved ? <p className="text-sm font-semibold text-[var(--success)]">{saved}</p> : null}
      <button className="btn btn-primary" disabled={saving}>
        <BusyLabel busy={saving}>Save changes</BusyLabel>
      </button>
    </form>
  );
}
