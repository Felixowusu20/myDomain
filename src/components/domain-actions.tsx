"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RecordRow = {
  id: string;
  type: string;
  host: string;
  value: string;
  ttl: number;
  priority: number | null;
};

export function DomainActions({
  domainId,
  domainName,
  autoRenew,
  nameservers,
  records,
  locked,
  privacyEnabled,
  status,
}: {
  domainId: string;
  domainName: string;
  autoRenew: boolean;
  nameservers: string[];
  records: RecordRow[];
  locked: boolean;
  privacyEnabled: boolean;
  status: string;
}) {
  const router = useRouter();
  const [ns, setNs] = useState(nameservers.join("\n"));
  const [renewOn, setRenewOn] = useState(autoRenew);
  const [isLocked, setIsLocked] = useState(locked);
  const [privacyOn, setPrivacyOn] = useState(privacyEnabled);
  const [authCode, setAuthCode] = useState("");
  const [form, setForm] = useState({ type: "A", host: "", value: "", ttl: 3600, priority: "" });
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"ok" | "err">("ok");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function refresh(path: string, options?: RequestInit) {
    const response = await fetch(path, options);
    const data = await response.json();
    if (!response.ok) {
      setMessageTone("err");
      setMessage(data.error ?? "Something went wrong");
      return;
    }
    setMessageTone("ok");
    setMessage("Saved.");
    router.refresh();
  }

  return (
    <div className="space-y-5" id="dns">
      {message ? (
        <p
          className={`text-sm font-semibold ${
            messageTone === "err" ? "text-[var(--danger)]" : "text-[var(--success)]"
          }`}
        >
          {message}
        </p>
      ) : null}
      <section className="card p-5">
        <h2 className="font-bold text-[var(--navy)]">DNS management</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add custom A, CNAME, MX, or TXT records for this domain.
        </p>
        <div className="mt-4 table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Type</th>
                <th>Host</th>
                <th>Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>{record.type}</td>
                  <td>{record.host}</td>
                  <td>{record.value}</td>
                  <td>
                    <button
                      className="text-sm font-semibold text-[var(--danger)]"
                      onClick={() =>
                        refresh(`/api/domains/${domainId}/dns/${record.id}`, { method: "DELETE" })
                      }
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form
          className="mt-4 grid gap-3 md:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            refresh(`/api/domains/${domainId}/dns`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: form.type,
                host: form.host,
                value: form.value,
                ttl: Number(form.ttl),
                priority: form.priority ? Number(form.priority) : undefined,
              }),
            });
          }}
        >
          <select
            className="rounded-xl border border-[var(--line)] bg-[var(--field-bg)] px-3 py-2 text-[var(--ink)]"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            {["A", "CNAME", "MX", "TXT"].map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <input
            className="rounded-xl border border-[var(--line)] bg-[var(--field-bg)] px-3 py-2 text-[var(--ink)] placeholder:text-[var(--muted)]"
            placeholder="Host"
            value={form.host}
            onChange={(e) => setForm({ ...form, host: e.target.value })}
          />
          <input
            className="rounded-xl border border-[var(--line)] bg-[var(--field-bg)] px-3 py-2 text-[var(--ink)] placeholder:text-[var(--muted)]"
            placeholder="Value"
            value={form.value}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
          />
          <button className="btn btn-dark">Add record</button>
        </form>
      </section>
      <section className="card p-5">
        <h2 className="font-bold text-[var(--navy)]">Advanced</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            refresh(`/api/domains/${domainId}/nameservers`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nameservers: ns.split("\n").map((item) => item.trim()).filter(Boolean) }),
            });
          }}
        >
          <label className="field">
            <span>Nameservers</span>
            <textarea
              rows={3}
              value={ns}
              onChange={(event) => setNs(event.target.value)}
              placeholder={"ns1.example.com\nns2.example.com"}
            />
          </label>
          <button className="btn btn-ghost">Save nameservers</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="btn btn-ghost"
            onClick={() => {
              setRenewOn(!renewOn);
              refresh(`/api/domains/${domainId}/auto-renew`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: !renewOn }),
              });
            }}
          >
            Auto-renew: {renewOn ? "ON" : "OFF"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setIsLocked(!isLocked);
              refresh(`/api/domains/${domainId}/lock`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ locked: !isLocked }),
              });
            }}
          >
            Lock: {isLocked ? "ON" : "OFF"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => {
              setPrivacyOn(!privacyOn);
              refresh(`/api/domains/${domainId}/privacy`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: !privacyOn }),
              });
            }}
          >
            Privacy: {privacyOn ? "ON" : "OFF"}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => refresh(`/api/domains/${domainId}/renew`, { method: "POST" })}
          >
            Renew domain
          </button>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              const response = await fetch(`/api/domains/${domainId}/auth-code`);
              const data = await response.json();
              if (!response.ok) {
                setMessageTone("err");
                setMessage(data.error ?? "Could not fetch the auth code.");
                return;
              }
              setAuthCode(data.authCode);
              setMessageTone("ok");
              setMessage("Auth code ready.");
            }}
          >
            Get transfer code
          </button>
          {status === "PENDING_TRANSFER" ? (
            <button
              className="btn btn-ghost"
              onClick={() => refresh(`/api/domains/${domainId}/cancel-transfer`, { method: "POST" })}
            >
              Cancel transfer in
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() =>
                refresh(`/api/domains/${domainId}/cancel-transfer-out`, { method: "POST" })
              }
            >
              Stop transfer out
            </button>
          )}
        </div>
        {authCode ? <p className="mt-3 text-sm font-semibold text-[var(--ink)]">{authCode}</p> : null}
      </section>

      <section className="card space-y-3 border-[color-mix(in_srgb,var(--danger)_35%,var(--line))] p-5">
        <h2 className="font-bold text-[var(--danger)]">Delete domain</h2>
        <p className="text-sm text-[var(--muted)]">
          Permanently remove <span className="font-semibold text-[var(--ink)]">{domainName}</span> from
          your account. This cannot be undone. Auto-renew is turned off at the registrar when possible.
        </p>
        <label className="field max-w-md">
          <span>Type {domainName} to confirm</span>
          <input
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            autoComplete="off"
            placeholder={domainName}
          />
        </label>
        <button
          type="button"
          className="btn btn-ghost text-[var(--danger)]"
          disabled={deleting || deleteConfirm.trim().toLowerCase() !== domainName.toLowerCase()}
          onClick={async () => {
            if (!window.confirm(`Delete ${domainName} permanently from your account?`)) return;
            setDeleting(true);
            setMessage("");
            try {
              const response = await fetch(`/api/domains/${domainId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirmName: deleteConfirm }),
              });
              const data = await response.json();
              if (!response.ok) {
                setMessageTone("err");
                setMessage(data.error ?? "Could not delete this domain.");
                return;
              }
              router.push(data.redirectTo ?? "/domains");
              router.refresh();
            } finally {
              setDeleting(false);
            }
          }}
        >
          {deleting ? "Deleting…" : "Delete domain permanently"}
        </button>
      </section>
    </div>
  );
}
