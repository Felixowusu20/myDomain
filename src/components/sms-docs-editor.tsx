"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BusyLabel } from "@/components/spinner";

export type EditableDoc = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  sortOrder: number;
  published: boolean;
  updatedLabel: string;
};

export function SmsDocsEditor({ pages }: { pages: EditableDoc[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(pages[0]?.id ?? "");
  const selected = pages.find((page) => page.id === selectedId) ?? pages[0];
  const [title, setTitle] = useState(selected?.title ?? "");
  const [summary, setSummary] = useState(selected?.summary ?? "");
  const [body, setBody] = useState(selected?.body ?? "");
  const [sortOrder, setSortOrder] = useState(String(selected?.sortOrder ?? 0));
  const [published, setPublished] = useState(selected?.published ?? true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [pendingId, setPendingId] = useState("");

  useEffect(() => {
    if (pendingId && pages.some((page) => page.id === pendingId)) {
      setSelectedId(pendingId);
      setPendingId("");
      return;
    }
    if (selectedId && pages.some((page) => page.id === selectedId)) return;
    if (!pendingId) setSelectedId(pages[0]?.id ?? "");
  }, [pages, selectedId, pendingId]);

  useEffect(() => {
    const page = pages.find((item) => item.id === selectedId);
    if (!page) return;
    setTitle(page.title);
    setSummary(page.summary);
    setBody(page.body);
    setSortOrder(String(page.sortOrder));
    setPublished(page.published);
    setSaved("");
    setError("");
  }, [selectedId, pages]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch("/api/admin/cms/docs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          title,
          summary,
          body,
          sortOrder: Number(sortOrder),
          published,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not save this section.");
        return;
      }
      setSaved("Saved. The public guide uses this text now.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/cms/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not add the section.");
        return;
      }
      setNewTitle("");
      setCreating(false);
      if (data.page?.id) setPendingId(data.page.id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!selected) return;
    if (!window.confirm(`Remove “${selected.title}” from the guide?`)) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/cms/docs?id=${selected.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "Could not remove the section.");
        return;
      }
      setSelectedId("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="card space-y-1 p-3">
          {pages.map((page, index) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setSelectedId(page.id)}
              className={`flex w-full gap-2 rounded-lg px-2 py-2 text-left text-sm font-semibold ${
                page.id === selected?.id ? "bg-[var(--field-bg)] text-[var(--navy)]" : "text-[var(--muted)]"
              }`}
            >
              <span className="w-6 shrink-0 tabular-nums">{String(index + 1).padStart(2, "0")}</span>
              <span>
                {page.title}
                {page.published ? "" : " · hidden"}
              </span>
            </button>
          ))}
        </div>
        {creating ? (
          <form onSubmit={onCreate} className="card space-y-2 p-3">
            <label className="field">
              <span>New section title</span>
              <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} required minLength={2} maxLength={120} />
            </label>
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Add section
            </button>
          </form>
        ) : (
          <button className="btn btn-ghost" type="button" onClick={() => setCreating(true)}>
            Add a section
          </button>
        )}
      </div>
      {selected ? (
        <form onSubmit={onSave} className="card space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">/{selected.slug}</p>
            <p className="text-xs text-[var(--muted)]">Updated {selected.updatedLabel}</p>
          </div>
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} maxLength={120} />
          </label>
          <label className="field">
            <span>Summary</span>
            <input value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={200} />
          </label>
          <label className="field">
            <span>Body</span>
            <textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={18} className="font-mono text-sm" />
          </label>
          <p className="text-xs leading-5 text-[var(--muted)]">
            Blank line between paragraphs. <code>- </code> for bullets, <code>1. </code> for steps, and three backticks for code.
            Write <code>{"{{baseUrl}}"}</code> where the site address should appear. <code>**bold**</code>, <code>`code`</code>, and
            <code> [label](/path)</code> work in paragraphs.
          </p>
          <div className="flex flex-wrap items-end gap-4">
            <label className="field">
              <span>Order</span>
              <input value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} inputMode="numeric" className="w-24" />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm font-semibold">
              <input type="checkbox" checked={published} onChange={(event) => setPublished(event.target.checked)} />
              Show on the public guide
            </label>
          </div>
          {error ? <p className="text-sm font-semibold text-[var(--danger)]">{error}</p> : null}
          {saved ? <p className="text-sm font-semibold text-[var(--navy)]">{saved}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              <BusyLabel busy={busy} busyText="Saving...">
                Save section
              </BusyLabel>
            </button>
            <button className="btn btn-ghost" type="button" disabled={busy} onClick={() => void onDelete()}>
              Remove
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-[var(--muted)]">Add a section to start the guide.</p>
      )}
    </div>
  );
}
