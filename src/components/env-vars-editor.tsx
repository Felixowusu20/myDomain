"use client";

import type { ClipboardEvent, ChangeEvent } from "react";
import { useRef, useState } from "react";
import { ClipboardPaste, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { applyEnvPaste, parseEnvPaste, shouldTreatAsEnvPaste, type EnvVarRow } from "@/lib/env-paste";

export type { EnvVarRow };

export function EnvVarsEditor({
  value,
  onChange,
  lockedKeys = [],
  hint,
}: {
  value: EnvVarRow[];
  onChange: (rows: EnvVarRow[]) => void;
  lockedKeys?: string[];
  hint?: string;
}) {
  const rows = value.length ? value : [{ key: "", value: "" }];
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const [pasteDraft, setPasteDraft] = useState("");
  const [showValues, setShowValues] = useState(true);
  const [pasteNote, setPasteNote] = useState("");

  function update(index: number, field: keyof EnvVarRow, next: string) {
    onChange(rowsRef.current.map((row, i) => (i === index ? { ...row, [field]: next } : row)));
  }

  function remove(index: number) {
    const next = rowsRef.current.filter((_, i) => i !== index);
    onChange(next.length ? next : [{ key: "", value: "" }]);
  }

  function fillFromPaste(text: string) {
    if (!shouldTreatAsEnvPaste(text)) return false;
    const pasted = parseEnvPaste(text);
    if (!pasted.length) return false;
    const next = applyEnvPaste(rowsRef.current, pasted);
    rowsRef.current = next;
    onChange(next);
    setPasteNote(`Added ${pasted.length} variable${pasted.length === 1 ? "" : "s"} automatically.`);
    setShowValues(true);
    return true;
  }

  function handleEnvPaste(event: ClipboardEvent<HTMLElement>) {
    const text = event.clipboardData.getData("text") || event.clipboardData.getData("text/plain");
    if (!shouldTreatAsEnvPaste(text)) return;
    event.preventDefault();
    event.stopPropagation();
    fillFromPaste(text);
    setPasteDraft("");
  }

  function onBulkChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const text = event.target.value;
    setPasteDraft(text);
    // Some browsers deliver paste via change; auto-fill as soon as it looks like a .env block.
    if (shouldTreatAsEnvPaste(text) && (text.includes("\n") || parseEnvPaste(text).length > 1)) {
      fillFromPaste(text);
      setPasteDraft("");
    }
  }

  return (
    <div className="space-y-3" onPaste={handleEnvPaste}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-[var(--navy)]">Environment variables</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {hint ??
              "Paste your full .env into the box or any KEY field — rows are created and filled automatically."}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          data-no-loader
          onClick={() => setShowValues((current) => !current)}
        >
          {showValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {showValues ? "Hide values" : "Show values"}
        </button>
      </div>

      <label className="field">
        <span className="inline-flex items-center gap-1.5">
          <ClipboardPaste className="h-3.5 w-3.5" />
          Paste .env here
        </span>
        <textarea
          value={pasteDraft}
          onChange={onBulkChange}
          onPaste={handleEnvPaste}
          rows={5}
          spellCheck={false}
          autoComplete="off"
          placeholder={"DATABASE_URL=postgres://...\nAPI_KEY=secret\nNEXT_PUBLIC_APP_URL=https://..."}
          className="font-mono text-xs leading-5"
        />
      </label>
      {pasteNote ? <p className="text-xs font-semibold text-[var(--success)]">{pasteNote}</p> : null}

      <div className="space-y-2">
        {rows.map((row, index) => {
          const suggested = Boolean(row.key && lockedKeys.includes(row.key));
          return (
            <div key={`${row.key}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                value={row.key}
                onChange={(event) => update(index, "key", event.target.value)}
                onPaste={handleEnvPaste}
                placeholder={index === 0 ? "Paste KEY=value lines or type KEY" : "KEY"}
                autoComplete="off"
                spellCheck={false}
                aria-label={suggested ? `${row.key} (from repository)` : "Environment variable key"}
              />
              <input
                type={showValues ? "text" : "password"}
                value={row.value}
                onChange={(event) => update(index, "value", event.target.value)}
                onPaste={handleEnvPaste}
                placeholder="value"
                autoComplete="off"
                spellCheck={false}
                aria-label={`${row.key || "Environment variable"} value`}
              />
              <button
                type="button"
                className="btn btn-ghost"
                data-no-loader
                onClick={() => remove(index)}
                disabled={rows.length === 1}
                aria-label="Remove variable"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          className="btn btn-ghost"
          data-no-loader
          onClick={() => onChange([...rowsRef.current, { key: "", value: "" }])}
        >
          <Plus className="h-4 w-4" />
          Add variable
        </button>
      </div>
    </div>
  );
}
