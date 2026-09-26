export type EnvVarRow = { key: string; value: string };

/** Parse pasted .env / Vercel-style KEY=value blocks into rows. */
export function parseEnvPaste(raw: string): EnvVarRow[] {
  const rows: EnvVarRow[] = [];
  const seen = new Set<string>();

  for (const line of raw.split(/\r?\n/)) {
    let trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^export\s+/i.test(trimmed)) trimmed = trimmed.replace(/^export\s+/i, "");

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    let value = match[2] ?? "";

    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    } else {
      const hash = value.search(/(^|\s)#/);
      if (hash >= 0) value = value.slice(0, hash).trimEnd();
    }

    if (seen.has(key)) {
      const index = rows.findIndex((row) => row.key === key);
      if (index >= 0) rows[index] = { key, value };
      continue;
    }
    seen.add(key);
    rows.push({ key, value });
    if (rows.length >= 50) break;
  }

  return rows;
}

export function shouldTreatAsEnvPaste(text: string) {
  const trimmed = text.trim();
  if (!trimmed.includes("=")) return false;
  return parseEnvPaste(trimmed).length > 0;
}

/**
 * Apply a pasted .env block into the editor.
 * Matching keys get their values filled; new keys are added with values;
 * other existing filled rows are kept.
 */
export function applyEnvPaste(current: EnvVarRow[], pasted: EnvVarRow[]): EnvVarRow[] {
  if (!pasted.length) return current.length ? current : [{ key: "", value: "" }];

  const byKey = new Map<string, string>();
  for (const row of current) {
    const key = row.key.trim();
    if (!key) continue;
    byKey.set(key, row.value);
  }
  for (const row of pasted) {
    byKey.set(row.key, row.value);
  }

  const order: string[] = [];
  for (const row of current) {
    const key = row.key.trim();
    if (key && byKey.has(key) && !order.includes(key)) order.push(key);
  }
  for (const row of pasted) {
    if (!order.includes(row.key)) order.push(row.key);
  }

  const next = order.map((key) => ({ key, value: byKey.get(key) ?? "" }));
  next.push({ key: "", value: "" });
  return next.slice(0, 50);
}
