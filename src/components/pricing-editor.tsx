"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/utils";

type Row = {
  id: string;
  tld: string;
  wholesaleCents: number;
  originalCents: number;
  namecomRetailCents: number;
  retailCents: number;
  renewalCents: number;
  transferCents: number;
  status: string;
};

function dollars(cents: number) {
  return (Math.round(cents) / 100).toFixed(2);
}

export function PricingEditor({ rows }: { rows: Row[] }) {
  const [items, setItems] = useState(rows);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"tld" | "cost-asc" | "cost-desc" | "margin">("cost-asc");
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^\./, "");
    let next = items;
    if (q) next = next.filter((row) => row.tld.toLowerCase().includes(q));
    const sorted = [...next];
    if (sort === "cost-asc") sorted.sort((a, b) => a.wholesaleCents - b.wholesaleCents || a.tld.localeCompare(b.tld));
    else if (sort === "cost-desc") sorted.sort((a, b) => b.wholesaleCents - a.wholesaleCents || a.tld.localeCompare(b.tld));
    else if (sort === "margin")
      sorted.sort(
        (a, b) =>
          b.retailCents - b.wholesaleCents - (a.retailCents - a.wholesaleCents) || a.tld.localeCompare(b.tld),
      );
    else sorted.sort((a, b) => a.tld.localeCompare(b.tld));
    return sorted;
  }, [items, query, sort]);

  async function save(row: Row) {
    setSaving(row.id);
    setNotice("");
    const response = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        retailCents: row.retailCents,
        renewalCents: row.renewalCents,
        transferCents: row.transferCents,
        status: row.status,
      }),
    });
    const data = await response.json();
    setSaving(null);
    if (!response.ok) {
      setNotice(data.error ?? "Could not save that TLD.");
      return;
    }
    if (data.pricing) {
      setItems((current) => current.map((item) => (item.id === row.id ? { ...item, ...data.pricing } : item)));
      setNotice(`Saved ${row.tld}.`);
    }
  }

  function setPrice(id: string, field: "retailCents" | "renewalCents" | "transferCents", dollarsValue: string) {
    const cents = Math.max(0, Math.round(Number(dollarsValue || 0) * 100));
    setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: cents } : item)));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          className="w-full max-w-xs rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm"
          placeholder="Filter extensions, like site or com"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
          Sort
          <select
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
            value={sort}
            onChange={(event) => setSort(event.target.value as typeof sort)}
          >
            <option value="cost-asc">Cheapest cost first</option>
            <option value="cost-desc">Highest cost first</option>
            <option value="margin">Highest margin first</option>
            <option value="tld">A–Z</option>
          </select>
        </label>
        <p className="text-sm text-[var(--muted)]">
          {filtered.length} of {items.length} live TLDs
        </p>
      </div>
      {notice ? <p className="text-sm font-semibold text-[var(--success)]">{notice}</p> : null}
      <div className="card table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>TLD</th>
              <th>Your cost</th>
              <th>name.com list</th>
              <th>Your sell price</th>
              <th>Renewal</th>
              <th>Transfer</th>
              <th>Margin</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const margin = row.retailCents - row.wholesaleCents;
              return (
                <tr key={row.id}>
                  <td className="font-semibold">{row.tld}</td>
                  <td className="font-semibold text-[var(--navy)]">
                    {row.wholesaleCents ? formatUsd(row.wholesaleCents) : "—"}
                  </td>
                  <td className="text-[var(--muted)]">
                    {row.originalCents ? formatUsd(row.originalCents) : "—"}
                  </td>
                  <td>
                    <input
                      className="w-24 rounded border px-2 py-1"
                      type="number"
                      min={0}
                      step="0.01"
                      value={dollars(row.retailCents)}
                      onChange={(event) => setPrice(row.id, "retailCents", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="w-24 rounded border px-2 py-1"
                      type="number"
                      min={0}
                      step="0.01"
                      value={dollars(row.renewalCents)}
                      onChange={(event) => setPrice(row.id, "renewalCents", event.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      className="w-24 rounded border px-2 py-1"
                      type="number"
                      min={0}
                      step="0.01"
                      value={dollars(row.transferCents)}
                      onChange={(event) => setPrice(row.id, "transferCents", event.target.value)}
                    />
                  </td>
                  <td className={margin > 0 ? "font-semibold text-[var(--success)]" : "text-[var(--muted)]"}>
                    {formatUsd(margin)}
                  </td>
                  <td>{row.status}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      disabled={saving === row.id}
                      onClick={() => void save(row)}
                      type="button"
                    >
                      {saving === row.id ? "Saving" : "Save"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
