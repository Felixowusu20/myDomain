"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BusyLabel } from "@/components/spinner";

export function CustomerStatusButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(next: "ACTIVE" | "SUSPENDED") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/customers/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not update status.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status === "ACTIVE" ? (
          <button className="btn btn-ghost" disabled={busy} onClick={() => void setStatus("SUSPENDED")}>
            <BusyLabel busy={busy}>Suspend</BusyLabel>
          </button>
        ) : (
          <button className="btn btn-primary" disabled={busy} onClick={() => void setStatus("ACTIVE")}>
            <BusyLabel busy={busy}>Reactivate</BusyLabel>
          </button>
        )}
      </div>
      {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
