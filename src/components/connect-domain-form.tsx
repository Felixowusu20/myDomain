"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BusyLabel } from "@/components/spinner";

export function ConnectDomainForm({
  hostingId,
  domains,
}: {
  hostingId: string;
  domains: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const [state, setState] = useState<"idle" | "connecting" | "done">("idle");
  const [error, setError] = useState("");

  async function connect() {
    setState("connecting");
    setError("");
    const response = await fetch(`/api/hosting/${hostingId}/connect-domain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domainId }),
    });
    const data = await response.json();
    if (!response.ok) {
      setState("idle");
      setError(data.error ?? "Could not connect");
      return;
    }
    setState("done");
    router.refresh();
  }

  if (!domains.length) return <p className="mt-3 text-sm">Register a domain first, then connect it here.</p>;

  return (
    <div className="mt-4 space-y-3">
      <label className="field">
        <span>Select domain</span>
        <select value={domainId} onChange={(event) => setDomainId(event.target.value)}>
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.name}
            </option>
          ))}
        </select>
      </label>
      <button className="btn btn-primary" onClick={connect} disabled={state === "connecting"}>
        <BusyLabel busy={state === "connecting"} busyText="Connecting">
          Connect
        </BusyLabel>
      </button>
      {state === "done" ? <p className="font-semibold text-[var(--success)]">CONNECTED ✓</p> : null}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
