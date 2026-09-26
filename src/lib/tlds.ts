export type TldCatalogItem = {
  tld: string;
  wholesaleCents: number;
  retailCents: number;
  renewalCents: number;
  transferCents: number;
};

export const TLD_CATALOG: TldCatalogItem[] = [
  { tld: ".com", wholesaleCents: 1500, retailCents: 2500, renewalCents: 2500, transferCents: 2000 },
  { tld: ".net", wholesaleCents: 1200, retailCents: 2200, renewalCents: 2200, transferCents: 1800 },
  { tld: ".org", wholesaleCents: 1200, retailCents: 2200, renewalCents: 2200, transferCents: 1800 },
  { tld: ".co", wholesaleCents: 1800, retailCents: 2800, renewalCents: 2800, transferCents: 2400 },
  { tld: ".io", wholesaleCents: 2800, retailCents: 4500, renewalCents: 4500, transferCents: 4000 },
  { tld: ".ai", wholesaleCents: 4000, retailCents: 6500, renewalCents: 6500, transferCents: 6000 },
  { tld: ".app", wholesaleCents: 1800, retailCents: 3200, renewalCents: 3200, transferCents: 2800 },
  { tld: ".dev", wholesaleCents: 1800, retailCents: 3200, renewalCents: 3200, transferCents: 2800 },
  { tld: ".store", wholesaleCents: 2000, retailCents: 3500, renewalCents: 3500, transferCents: 3000 },
  { tld: ".shop", wholesaleCents: 1800, retailCents: 3000, renewalCents: 3000, transferCents: 2600 },
  { tld: ".online", wholesaleCents: 800, retailCents: 1800, renewalCents: 1800, transferCents: 1600 },
  { tld: ".site", wholesaleCents: 800, retailCents: 1600, renewalCents: 1600, transferCents: 1400 },
  { tld: ".website", wholesaleCents: 800, retailCents: 1600, renewalCents: 1600, transferCents: 1400 },
  { tld: ".xyz", wholesaleCents: 400, retailCents: 1200, renewalCents: 1200, transferCents: 1000 },
  { tld: ".space", wholesaleCents: 500, retailCents: 1400, renewalCents: 1400, transferCents: 1200 },
  { tld: ".tech", wholesaleCents: 1500, retailCents: 2800, renewalCents: 2800, transferCents: 2400 },
  { tld: ".cloud", wholesaleCents: 1800, retailCents: 3200, renewalCents: 3200, transferCents: 2800 },
  { tld: ".blog", wholesaleCents: 1500, retailCents: 2600, renewalCents: 2600, transferCents: 2200 },
  { tld: ".me", wholesaleCents: 1400, retailCents: 2400, renewalCents: 2400, transferCents: 2000 },
  { tld: ".info", wholesaleCents: 800, retailCents: 1600, renewalCents: 1600, transferCents: 1400 },
  { tld: ".biz", wholesaleCents: 900, retailCents: 1800, renewalCents: 1800, transferCents: 1500 },
  { tld: ".tv", wholesaleCents: 2500, retailCents: 4000, renewalCents: 4000, transferCents: 3500 },
  { tld: ".cc", wholesaleCents: 1000, retailCents: 2000, renewalCents: 2000, transferCents: 1800 },
  { tld: ".pro", wholesaleCents: 1200, retailCents: 2200, renewalCents: 2200, transferCents: 1900 },
  { tld: ".club", wholesaleCents: 700, retailCents: 1500, renewalCents: 1500, transferCents: 1300 },
  { tld: ".live", wholesaleCents: 1200, retailCents: 2200, renewalCents: 2200, transferCents: 1900 },
  { tld: ".world", wholesaleCents: 1200, retailCents: 2200, renewalCents: 2200, transferCents: 1900 },
  { tld: ".email", wholesaleCents: 1000, retailCents: 2000, renewalCents: 2000, transferCents: 1700 },
  { tld: ".agency", wholesaleCents: 1400, retailCents: 2600, renewalCents: 2600, transferCents: 2200 },
  { tld: ".studio", wholesaleCents: 1400, retailCents: 2600, renewalCents: 2600, transferCents: 2200 },
  { tld: ".design", wholesaleCents: 2500, retailCents: 4000, renewalCents: 4000, transferCents: 3500 },
  { tld: ".digital", wholesaleCents: 1400, retailCents: 2600, renewalCents: 2600, transferCents: 2200 },
  { tld: ".media", wholesaleCents: 1400, retailCents: 2600, renewalCents: 2600, transferCents: 2200 },
  { tld: ".news", wholesaleCents: 1400, retailCents: 2600, renewalCents: 2600, transferCents: 2200 },
  { tld: ".today", wholesaleCents: 1000, retailCents: 1800, renewalCents: 1800, transferCents: 1600 },
  { tld: ".life", wholesaleCents: 1000, retailCents: 1800, renewalCents: 1800, transferCents: 1600 },
  { tld: ".fun", wholesaleCents: 800, retailCents: 1600, renewalCents: 1600, transferCents: 1400 },
  { tld: ".top", wholesaleCents: 400, retailCents: 1000, renewalCents: 1000, transferCents: 800 },
  { tld: ".vip", wholesaleCents: 800, retailCents: 1800, renewalCents: 1800, transferCents: 1500 },
  { tld: ".link", wholesaleCents: 500, retailCents: 1200, renewalCents: 1200, transferCents: 1000 },
  { tld: ".gg", wholesaleCents: 2500, retailCents: 4000, renewalCents: 4000, transferCents: 3500 },
  { tld: ".fm", wholesaleCents: 2500, retailCents: 4000, renewalCents: 4000, transferCents: 3500 },
  { tld: ".ca", wholesaleCents: 1400, retailCents: 2500, renewalCents: 2500, transferCents: 2200 },
  { tld: ".uk", wholesaleCents: 1000, retailCents: 1800, renewalCents: 1800, transferCents: 1600 },
  { tld: ".us", wholesaleCents: 800, retailCents: 1600, renewalCents: 1600, transferCents: 1400 },
  { tld: ".eu", wholesaleCents: 800, retailCents: 1600, renewalCents: 1600, transferCents: 1400 },
  { tld: ".in", wholesaleCents: 700, retailCents: 1500, renewalCents: 1500, transferCents: 1300 },
  { tld: ".ng", wholesaleCents: 1200, retailCents: 2200, renewalCents: 2200, transferCents: 1900 },
  { tld: ".ke", wholesaleCents: 1400, retailCents: 2500, renewalCents: 2500, transferCents: 2200 },
  { tld: ".za", wholesaleCents: 1400, retailCents: 2500, renewalCents: 2500, transferCents: 2200 },
  { tld: ".gh", wholesaleCents: 2500, retailCents: 4500, renewalCents: 4500, transferCents: 4000 },
  { tld: ".com.gh", wholesaleCents: 2000, retailCents: 3800, renewalCents: 3800, transferCents: 3400 },
  { tld: ".africa", wholesaleCents: 3000, retailCents: 5000, renewalCents: 5000, transferCents: 4500 },
];

export type TldFilterTab = {
  id: string;
  label: string;
  hint: string;
  tlds?: string[];
  maxCents?: number;
  minCents?: number;
};

export const TLD_FILTER_TABS: TldFilterTab[] = [
  { id: "all", label: "All", hint: "Every extension" },
  { id: "popular", label: "Popular", hint: "Most searched", tlds: [".com", ".net", ".org", ".co", ".io", ".me"] },
  { id: "africa", label: "Africa", hint: "Local presence", tlds: [".gh", ".com.gh", ".ng", ".ke", ".za", ".africa"] },
  { id: "tech", label: "Tech", hint: "Builders", tlds: [".io", ".ai", ".dev", ".app", ".tech", ".cloud", ".gg", ".fm"] },
  { id: "shop", label: "Shop", hint: "Stores", tlds: [".store", ".shop", ".online", ".site", ".website", ".biz"] },
  { id: "creative", label: "Creative", hint: "Studios", tlds: [".design", ".studio", ".agency", ".media", ".blog", ".fun"] },
  { id: "country", label: "Country", hint: "ccTLDs", tlds: [".us", ".uk", ".ca", ".eu", ".in", ".gh"] },
  { id: "budget", label: "Budget", hint: "Under $20", maxCents: 2000 },
  { id: "premium", label: "Premium", hint: "$40 and up", minCents: 4000 },
];

export function extractSearchName(input: string) {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/[^a-z0-9.-]/g, "");
  if (!cleaned) return "";
  const known = [...TLD_CATALOG]
    .sort((a, b) => b.tld.length - a.tld.length)
    .find((item) => cleaned.endsWith(item.tld));
  if (known) return cleaned.slice(0, -known.tld.length);
  const [sld] = cleaned.split(".");
  return sld ?? "";
}

/** Pull `.site` from `hi.site` (or a lone `.site`) so search can pin that extension first. */
export function extractTldFromQuery(input: string) {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "")
    .replace(/[^a-z0-9.-]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith(".") && cleaned.length > 1) return cleaned;
  const known = [...TLD_CATALOG]
    .sort((a, b) => b.tld.length - a.tld.length)
    .find((item) => cleaned.endsWith(item.tld) && cleaned.length > item.tld.length);
  if (known) return known.tld;
  const dot = cleaned.indexOf(".");
  if (dot > 0 && dot < cleaned.length - 1) return cleaned.slice(dot);
  return "";
}
