"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BusyLabel } from "@/components/spinner";

export function AdminSyncButton({
  path,
  label,
  body,
}: {
  path: string;
  label: string;
  body?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function run() {
    setLoading(true);
    setMessage("");
    const response = await fetch(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json().catch(() => ({}));
    setLoading(false);
    if (!response.ok) {
      setMessage(data.error ?? "Sync failed.");
      return;
    }
    if (data.resetMargins) {
      setMessage(`Reset ${data.received ?? 0} TLDs to your name.com cost.`);
    } else if (typeof data.received === "number") {
      setMessage(`Pulled ${data.received} TLDs from name.com.`);
    } else if (typeof data.synced === "number") {
      setMessage(`Synced ${data.synced} domains.`);
    } else {
      setMessage("Synced.");
    }
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <button className="btn btn-dark" onClick={run} disabled={loading} type="button">
        <BusyLabel busy={loading}>{label}</BusyLabel>
      </button>
      {message ? <p className="text-sm font-semibold">{message}</p> : null}
    </div>
  );
}
