"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Globe,
  MapPin,
  Palette,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Tag,
  Cpu,
  Flag,
} from "lucide-react";
import { formatUsd } from "@/lib/utils";
import { Spinner } from "@/components/spinner";
import { useTheme } from "@/components/theme-provider";
import {
  extractSearchName,
  extractTldFromQuery,
  TLD_CATALOG,
  TLD_FILTER_TABS,
  type TldFilterTab,
} from "@/lib/tlds";

type Row = {
  domain: string;
  tld: string;
  available: boolean;
  retailCents: number;
};

type SearchPayload = {
  sld: string;
  results: Row[];
  availableCount: number;
  takenCount: number;
  message: string | null;
  error?: string;
};

type FeaturedTld = {
  tld: string;
  retailCents: number;
  originalCents?: number;
};

const TAB_ICONS: Record<string, typeof Globe> = {
  all: Globe,
  popular: Star,
  africa: MapPin,
  tech: Cpu,
  shop: ShoppingBag,
  creative: Palette,
  country: Flag,
  budget: Tag,
  premium: Sparkles,
};

export function DomainSearch({
  initialQuery = "",
  initialTld = "",
  featuredTlds = [],
  placeholder,
  variant = "default",
}: {
  initialQuery?: string;
  initialTld?: string;
  featuredTlds?: FeaturedTld[];
  placeholder?: string;
  variant?: "default" | "hero";
}) {
  const router = useRouter();
  const { theme } = useTheme();
  const [query, setQuery] = useState(initialQuery);
  const [result, setResult] = useState<SearchPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [added, setAdded] = useState<string[]>([]);
  const [transferDomain, setTransferDomain] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [tab, setTab] = useState("all");
  const [availability, setAvailability] = useState<"all" | "available" | "taken">("all");
  const [sort, setSort] = useState<"best" | "price-asc" | "price-desc">("best");
  const [preferredTld, setPreferredTld] = useState(initialTld);
  const [highlightTld, setHighlightTld] = useState(initialTld);
  const timer = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestId = useRef(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function runSearch(value: string, quick = true) {
    const q = value.trim();
    if (q.length < 2) {
      abortRef.current?.abort();
      setResult(null);
      setError("");
      setLoading(false);
      return;
    }
    const typedTld = extractTldFromQuery(q);
    if (typedTld) {
      setPreferredTld(typedTld);
      setHighlightTld(typedTld);
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const id = ++requestId.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ q });
      if (quick) params.set("quick", "1");
      const response = await fetch(`/api/domains/search?${params.toString()}`, { signal: controller.signal });
      const data = await response.json();
      if (id !== requestId.current) return;
      setLoading(false);
      if (!response.ok) {
        setResult(null);
        setError(data.error ?? "Search failed");
        return;
      }
      setResult(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (id !== requestId.current) return;
      setLoading(false);
      setError("Search failed");
    }
  }

  useEffect(() => {
    if (initialQuery.trim().length >= 2) void runSearch(initialQuery, true);
    else if (initialTld) {
      setPreferredTld(normalizeTld(initialTld));
      setHighlightTld(normalizeTld(initialTld));
      setNotice(`Type a name above to check prices for ${normalizeTld(initialTld)}`);
      queueMicrotask(() => inputRef.current?.focus());
    }
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onChange(value: string) {
    setQuery(value);
    setNotice("");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void runSearch(value, true);
    }, 450);
  }

  function normalizeTld(tld: string) {
    const value = tld.trim().toLowerCase();
    return value.startsWith(".") ? value : `.${value}`;
  }

  function pickTld(tld: string) {
    const nextTld = normalizeTld(tld);
    setPreferredTld(nextTld);
    setHighlightTld(nextTld);
    setNotice("");
    setError("");
    const sld = extractSearchName(query) || result?.sld || "";
    if (sld.length >= 2) {
      const nextQuery = `${sld}${nextTld}`;
      setQuery(nextQuery);
      if (timer.current) window.clearTimeout(timer.current);
      void runSearch(nextQuery, false);
      return;
    }
    setNotice(`Type a name above to check prices for ${nextTld}`);
    inputRef.current?.focus();
  }

  async function search(event: FormEvent) {
    event.preventDefault();
    if (timer.current) window.clearTimeout(timer.current);
    const sld = extractSearchName(query);
    const next =
      preferredTld && sld.length >= 2 && !query.includes(".")
        ? `${sld}${normalizeTld(preferredTld)}`
        : query;
    if (next !== query) setQuery(next);
    await runSearch(next, false);
  }

  async function addToCart(domain: string) {
    setNotice("");
    const response = await fetch("/api/domains/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain, privacy: true }),
    });
    if (response.status === 401) {
      router.push(`/login?next=/search?q=${encodeURIComponent(domain)}`);
      return;
    }
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not add domain");
      return;
    }
    setNotice(`${domain} added to your cart.`);
    setAdded((current) => (current.includes(domain) ? current : [...current, domain]));
    router.refresh();
  }

  async function addTransfer() {
    if (!transferDomain || !authCode.trim()) {
      setError("Enter the transfer authorization code from the current registrar.");
      return;
    }
    setNotice("");
    setError("");
    const response = await fetch("/api/domains/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain: transferDomain, authCode: authCode.trim(), privacy: true }),
    });
    if (response.status === 401) {
      router.push(`/login?next=/search?q=${encodeURIComponent(transferDomain)}`);
      return;
    }
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Could not start that transfer");
      return;
    }
    setNotice(`${transferDomain} transfer added to your cart.`);
    setAdded((current) => (current.includes(transferDomain) ? current : [...current, transferDomain]));
    setTransferDomain("");
    setAuthCode("");
    router.refresh();
  }

  const filtered = useMemo(() => {
    if (!result) return [];
    const active = TLD_FILTER_TABS.find((item) => item.id === tab);
    const focusTld = preferredTld || extractTldFromQuery(query);
    const exactDomain = focusTld && result.sld ? `${result.sld}${focusTld}` : "";
    let rows = result.results;
    if (availability === "available") rows = rows.filter((item) => item.available);
    if (availability === "taken") rows = rows.filter((item) => !item.available);
    if (active?.tlds?.length) rows = rows.filter((item) => active.tlds?.includes(item.tld));
    if (active?.maxCents != null) rows = rows.filter((item) => item.retailCents <= active.maxCents!);
    if (active?.minCents != null) rows = rows.filter((item) => item.retailCents >= active.minCents!);
    const sorted = [...rows];
    if (sort === "price-asc") sorted.sort((a, b) => a.retailCents - b.retailCents);
    else if (sort === "price-desc") sorted.sort((a, b) => b.retailCents - a.retailCents);
    else
      sorted.sort(
        (a, b) =>
          Number(b.domain === exactDomain) - Number(a.domain === exactDomain) ||
          Number(Boolean(focusTld) && b.tld === focusTld) - Number(Boolean(focusTld) && a.tld === focusTld) ||
          Number(b.available) - Number(a.available) ||
          a.tld.localeCompare(b.tld),
      );
    return sorted;
  }, [availability, preferredTld, query, result, sort, tab]);

  const tabCounts = useMemo(() => {
    const source = result?.results ?? [];
    const counts: Record<string, number> = {};
    for (const item of TLD_FILTER_TABS) {
      counts[item.id] = source.filter((row) => matchesTab(row, item)).length;
    }
    return counts;
  }, [result]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [availability, preferredTld, sort, tab, result?.sld]);

  const available = useMemo(() => {
    const rows = result?.results.filter((item) => item.available) ?? [];
    const focusTld = preferredTld || extractTldFromQuery(query);
    const exactDomain = focusTld && result?.sld ? `${result.sld}${focusTld}` : "";
    return [...rows].sort(
      (a, b) =>
        Number(b.domain === exactDomain) - Number(a.domain === exactDomain) ||
        Number(Boolean(focusTld) && b.tld === focusTld) - Number(Boolean(focusTld) && a.tld === focusTld),
    );
  }, [preferredTld, query, result]);
  const hero = variant === "hero";
  const dark = theme === "dark" && !hero;
  const shownAvailable = hero ? available.slice(0, 4) : available;

  const showTldChips = query.trim().length > 0 && featuredTlds.length > 0;
  const tldChips = showTldChips ? (
      <div className={hero ? "tld-chip-row" : "tld-chip-row mt-3"}>
        {featuredTlds.slice(0, 6).map((item) => {
          const active = preferredTld === item.tld;
          return (
            <button
              key={item.tld}
              type="button"
              className={`tld-chip ${active ? "tld-chip-active" : ""}`}
              onClick={() => pickTld(item.tld)}
            >
              <strong>{item.tld}</strong>
              <span>{formatUsd(item.retailCents)}</span>
            </button>
          );
        })}
      </div>
    ) : null;

  const searchForm = (
    <form
      onSubmit={search}
      data-no-loader
      className={hero || dark ? "home-search-wrap" : "search-bar"}
    >
      <div className="relative flex-1">
        <Search
          className={`pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${
            hero || dark ? "hidden" : "text-[var(--muted)]"
          }`}
        />
        <input
          ref={inputRef}
          className={hero || dark ? "" : "search-bar-input"}
          placeholder={
            placeholder ??
            (preferredTld ? `myshop${preferredTld}` : hero ? "Find my domain." : "Search a name")
          }
          value={query}
          onChange={(event) => onChange(event.target.value)}
        />
        {loading ? (
          <span
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 ${
              hero || dark ? "text-[var(--navy)]" : "text-[var(--muted)]"
            }`}
          >
            <Spinner size="sm" />
          </span>
        ) : null}
      </div>
      <button className={hero || dark ? "btn btn-lime" : "btn btn-hot min-w-40"} type="submit">
        <Search className="h-4 w-4" />
        Search
      </button>
    </form>
  );

  if (hero) {
    return (
      <div className="home-search-panel">
        {searchForm}
        {tldChips}
        {error ? <p className="text-center text-sm font-semibold text-[#ffb4a2]">{error}</p> : null}
        {notice ? (
          <p className="text-center text-sm font-semibold text-[#9dffc6]">
            {notice}{" "}
            {notice.includes("cart") ? (
              <Link href="/cart" className="underline">
                View cart
              </Link>
            ) : null}
          </p>
        ) : null}
        {result ? (
          <div className="home-results">
            <div className="home-results-head">
              <strong>{result.sld}</strong>
              <span>{result.availableCount} available</span>
            </div>
            <div className="home-results-list">
              {shownAvailable.length ? (
                shownAvailable.map((item) => (
                  <ResultRow
                    key={item.domain}
                    result={item}
                    onAdd={addToCart}
                    added={added.includes(item.domain)}
                    highlight={item.tld === highlightTld}
                    compact
                  />
                ))
              ) : (
                <p className="py-6 text-center text-sm text-[var(--muted)]">No available extensions right now.</p>
              )}
            </div>
            {result.results.length > shownAvailable.length ? (
              <button
                className="btn btn-ghost mt-3 w-full"
                type="button"
                onClick={() => router.push(`/search?q=${encodeURIComponent(result.sld)}`)}
              >
                See all extensions
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const activeTab = TLD_FILTER_TABS.find((item) => item.id === tab);

  return (
    <div className={`search-engine ${dark ? "search-engine-dark" : ""}`}>
      {searchForm}
      {tldChips}

      <div className="search-category-grid">
        {TLD_FILTER_TABS.map((item) => {
          const Icon = TAB_ICONS[item.id] ?? Globe;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`search-category-card ${active ? "is-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>
                {item.label}
                <small>{item.hint}</small>
              </span>
              {result ? <em>{tabCounts[item.id] ?? 0}</em> : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className={`mt-1 text-sm font-semibold ${dark ? "text-red-300" : "text-[var(--danger)]"}`}>{error}</p>
      ) : null}
      {notice ? (
        <p className={`mt-1 text-sm font-semibold ${dark ? "text-[var(--lime)]" : "text-[var(--success)]"}`}>
          {notice}{" "}
          {notice.includes("cart") ? (
            <Link href="/cart" className="underline">
              View cart
            </Link>
          ) : null}
        </p>
      ) : null}

      {result ? (
        <div className="search-engine-body">
          <aside className="search-filters">
            <button
              className={`search-tab ${availability === "all" ? "is-active" : ""}`}
              type="button"
              onClick={() => setAvailability("all")}
            >
              <span>All</span>
              <em>{result.results.length}</em>
            </button>
            <button
              className={`search-tab ${availability === "available" ? "is-active" : ""}`}
              type="button"
              onClick={() => setAvailability("available")}
            >
              <span>Available</span>
              <em>{result.availableCount}</em>
            </button>
            <button
              className={`search-tab ${availability === "taken" ? "is-active" : ""}`}
              type="button"
              onClick={() => setAvailability("taken")}
            >
              <span>Taken</span>
              <em>{result.takenCount}</em>
            </button>
          </aside>
          <section className="search-results">
            <div className="search-results-toolbar">
              <div>
                <p className="search-results-title">
                  {filtered.length} {filtered.length === 1 ? "match" : "matches"} for {result.sld}
                  {activeTab && activeTab.id !== "all" ? (
                    <span className="search-results-meta ml-2">· {activeTab.label}</span>
                  ) : null}
                </p>
                <p className="search-results-meta">
                  {availability === "all"
                    ? "Available names first"
                    : availability === "available"
                      ? "Ready to register"
                      : "Transfer these in"}
                </p>
              </div>
              <label className="search-sort">
                <span>Sort</span>
                <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
                  <option value="best">Best match</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>
            </div>
            <div className="search-results-scroll" ref={listRef}>
              {filtered.length ? (
                filtered.map((item) => (
                  <ResultRow
                    key={item.domain}
                    result={item}
                    onAdd={addToCart}
                    onTransfer={() => {
                      setTransferDomain(item.domain);
                      setAuthCode("");
                      setError("");
                    }}
                    transferring={transferDomain === item.domain}
                    added={added.includes(item.domain)}
                    highlight={item.tld === highlightTld}
                  />
                ))
              ) : (
                <div className="search-empty">
                  <Globe className="h-8 w-8 text-[var(--accent)]" />
                  <p>No extensions in this filter.</p>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      setTab("all");
                      setAvailability("all");
                    }}
                  >
                    Show all results
                  </button>
                </div>
              )}
            </div>
            {transferDomain ? (
              <form
                className="search-transfer"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addTransfer();
                }}
              >
                <p className="text-sm font-semibold">Transfer {transferDomain} into myDomain</p>
                <input
                  className="w-full rounded-xl border border-[var(--line)] bg-white px-3 py-2"
                  placeholder="Authorization code from the current registrar"
                  value={authCode}
                  onChange={(event) => setAuthCode(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  <button className="btn btn-hot" type="submit">
                    Add transfer to cart
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => {
                      setTransferDomain("");
                      setAuthCode("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </div>
      ) : (
        <p className={`text-sm ${dark ? "text-[var(--lime)]" : "text-[var(--muted)]"}`}>
          {query.trim()
            ? "Hit Search to check live availability for the extensions above."
            : "Type a name above to see matching extensions and prices."}
        </p>
      )}
    </div>
  );
}

function matchesTab(row: Row, tab: TldFilterTab) {
  if (tab.tlds?.length && !tab.tlds.includes(row.tld)) return false;
  if (tab.maxCents != null && row.retailCents > tab.maxCents) return false;
  if (tab.minCents != null && row.retailCents < tab.minCents) return false;
  return true;
}

function ResultRow({
  result,
  onAdd,
  onTransfer,
  transferring,
  added,
  highlight,
  compact,
}: {
  result: Row;
  onAdd: (domain: string) => void;
  onTransfer?: () => void;
  transferring?: boolean;
  added: boolean;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`search-row ${result.available ? "is-open" : "is-taken"}${highlight ? " is-highlight" : ""}`}>
      <div>
        <p className="search-domain-name font-bold">
          <span className="search-domain-sld">{result.domain.replace(result.tld, "")}</span>
          <span className="search-tld">{result.tld}</span>
        </p>
        {!compact ? (
          <p className={`text-sm font-semibold ${result.available ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>
            {result.available ? "Available" : "Unavailable, already registered"}
          </p>
        ) : null}
      </div>
      {result.available ? (
        <div className="flex items-center gap-3">
          <p className="search-row-price">{formatUsd(result.retailCents)}/year</p>
          {added ? (
            <Link href="/cart" className="btn btn-ghost">
              <Check className="h-4 w-4 text-[var(--success)]" />
              Added
            </Link>
          ) : (
            <button className="btn btn-hot" onClick={() => onAdd(result.domain)} type="button">
              <ShoppingCart className="h-4 w-4" />
              Add to Cart
            </button>
          )}
        </div>
      ) : added ? (
        <Link href="/cart" className="btn btn-ghost">
          <Check className="h-4 w-4 text-[var(--success)]" />
          Transfer in cart
        </Link>
      ) : (
        <button className="btn btn-ghost" type="button" onClick={onTransfer}>
          {transferring ? "Enter code below" : "Transfer in"}
        </button>
      )}
    </div>
  );
}
