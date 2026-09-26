"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BusyLabel } from "@/components/spinner";

export function AdminCustomerDelete({
  customerId,
  email,
  name,
  domainCount,
}: {
  customerId: string;
  email: string;
  name: string;
  domainCount: number;
}) {
  const router = useRouter();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
      setError("Type the customer email to confirm deletion.");
      return;
    }
    if (
      !window.confirm(
        `Permanently delete ${name} and wipe their account data (${domainCount} domain${domainCount === 1 ? "" : "s"})?`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not delete this customer.");
        return;
      }
      router.push(data.redirectTo ?? "/admin/customers");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card space-y-3 border-[color-mix(in_srgb,var(--danger)_35%,var(--line))] p-5">
      <h2 className="font-bold text-[var(--danger)]">Delete customer</h2>
      <p className="text-sm text-[var(--muted)]">
        Use this to wipe members who never renewed, abandoned signups, or accounts you no longer want on
        the platform. Their domains are removed from this panel and auto-renew is turned off at the
        registrar when possible. This cannot be undone.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="field max-w-md">
          <span>Type {email} to confirm</span>
          <input
            type="email"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            autoComplete="off"
            placeholder={email}
            required
          />
        </label>
        <button
          type="submit"
          className="btn btn-ghost text-[var(--danger)]"
          disabled={busy || confirmEmail.trim().toLowerCase() !== email.toLowerCase()}
        >
          <BusyLabel busy={busy}>Delete customer permanently</BusyLabel>
        </button>
      </form>
      {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
    </section>
  );
}
