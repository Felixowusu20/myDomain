"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { BusyLabel } from "@/components/spinner";

export function AddServerForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", location: "", ipAddress: "" });
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/admin/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setForm({ name: "", location: "", ipAddress: "" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="card grid gap-3 p-4 md:grid-cols-4">
      <input className="rounded-xl border border-[var(--line)] px-3 py-2" placeholder="Server name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <input className="rounded-xl border border-[var(--line)] px-3 py-2" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required />
      <input className="rounded-xl border border-[var(--line)] px-3 py-2" placeholder="IP address" value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} required />
      <button className="btn btn-dark" disabled={loading}>
        <BusyLabel busy={loading}>Add server</BusyLabel>
      </button>
    </form>
  );
}
