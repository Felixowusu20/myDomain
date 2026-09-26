/** Stable Vercel apex target. Project-specific CNAMEs may differ — customers paste those from Vercel. */
export const VERCEL_APEX_A = "76.76.21.21";
export const VERCEL_WWW_CNAME_DEFAULT = "cname.vercel-dns.com";
export const VERCEL_NAMESERVERS = ["ns1.vercel-dns.com", "ns2.vercel-dns.com"] as const;

export type VercelConnectMethod = "records" | "nameservers";

export function vercelDnsPlan(wwwCname = VERCEL_WWW_CNAME_DEFAULT) {
  const cname = wwwCname.trim().replace(/\.$/, "") || VERCEL_WWW_CNAME_DEFAULT;
  return {
    method: "records" as const,
    records: [
      { type: "A" as const, host: "@", value: VERCEL_APEX_A, ttl: 3600 },
      { type: "CNAME" as const, host: "www", value: cname, ttl: 3600 },
    ],
    steps: [
      "In Vercel → Project → Settings → Domains, add your apex domain and www.",
      "If Vercel shows a project-specific CNAME for www, paste it below before applying.",
      "Click Apply DNS. Keep nameservers on this platform so we manage the zone.",
      "Wait for Vercel to verify (often a few minutes; up to 48 hours for DNS).",
    ],
  };
}

export function vercelNameserverPlan() {
  return {
    method: "nameservers" as const,
    nameservers: [...VERCEL_NAMESERVERS],
    steps: [
      "In Vercel → Project → Settings → Domains, add the domain and choose Nameservers.",
      "Apply the Vercel nameservers here. DNS for this domain will then be managed in Vercel.",
      "Re-add any MX/TXT records you need (email, verification) inside Vercel DNS.",
    ],
  };
}
