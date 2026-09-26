import { randomUUID } from "crypto";
import { TLD_CATALOG, extractSearchName } from "@/lib/tlds";
import type {
  DnsRecordInput,
  DnsRecordResult,
  DomainInfo,
  DomainProvider,
  DomainSearchResult,
  DomainStatus,
} from "@/lib/providers/types";

const TAKEN = new Set([
  "google.com",
  "facebook.com",
  "amazon.com",
  "apple.com",
  "microsoft.com",
  "youtube.com",
  "instagram.com",
  "twitter.com",
  "github.com",
  "openai.com",
  "johnsstore.com",
]);

const store = new Map<string, DomainInfo & { records: DnsRecordResult[] }>();

function defaultRecords(domain: string): DnsRecordResult[] {
  return [
    { id: randomUUID(), type: "A", host: "@", value: "192.0.2.10", ttl: 3600 },
    { id: randomUUID(), type: "CNAME", host: "www", value: domain, ttl: 3600 },
    {
      id: randomUUID(),
      type: "MX",
      host: "@",
      value: `mail.${domain}`,
      ttl: 3600,
      priority: 10,
    },
    {
      id: randomUUID(),
      type: "TXT",
      host: "@",
      value: `v=spf1 include:_spf.${domain} ~all`,
      ttl: 3600,
    },
  ];
}

function seedIfMissing(domain: string) {
  if (store.has(domain) || !TAKEN.has(domain)) return;
  const now = new Date("2026-08-01T00:00:00.000Z");
  const expires = new Date("2027-08-01T00:00:00.000Z");
  store.set(domain, {
    domain,
    status: "ACTIVE",
    registeredAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    autoRenew: true,
    nameservers: [],
    providerRef: `mock-dom-${domain}`,
    records: defaultRecords(domain),
  });
}

["johnsstore.com"].forEach(seedIfMissing);

function yearsFromNow(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString();
}

export class MockDomainProvider implements DomainProvider {
  async searchDomain(query: string): Promise<DomainSearchResult[]> {
    const sld = extractSearchName(query);
    return TLD_CATALOG.map((item) => {
      const domain = `${sld}${item.tld}`;
      const taken = TAKEN.has(domain) || store.has(domain);
      return {
        domain,
        tld: item.tld,
        available: !taken,
        retailCents: item.retailCents,
        reason: taken ? "taken" : undefined,
      };
    });
  }

  async checkAvailability(domain: string) {
    if (TAKEN.has(domain) || store.has(domain)) {
      return { available: false, reason: "registered" };
    }
    return { available: true };
  }

  async getDomain(domain: string) {
    if (TAKEN.has(domain)) seedIfMissing(domain);
    const found = store.get(domain);
    if (!found) return null;
    const { records: _records, ...info } = found;
    return info;
  }

  async registerDomain(input: {
    domain: string;
    years: number;
    customerEmail: string;
    privacy?: boolean;
  }) {
    const availability = await this.checkAvailability(input.domain);
    if (!availability.available) {
      throw new Error("DOMAIN_UNAVAILABLE");
    }
    const info: DomainInfo = {
      domain: input.domain,
      status: "ACTIVE",
      registeredAt: new Date().toISOString(),
      expiresAt: yearsFromNow(input.years),
      autoRenew: true,
      nameservers: [],
      providerRef: `mock-dom-${input.domain}`,
    };
    store.set(input.domain, { ...info, records: defaultRecords(input.domain) });
    TAKEN.add(input.domain);
    return info;
  }

  async renewDomain(domain: string, years: number) {
    const current = await this.getDomain(domain);
    if (!current) throw new Error("DOMAIN_NOT_FOUND");
    const expires = current.expiresAt ? new Date(current.expiresAt) : new Date();
    expires.setFullYear(expires.getFullYear() + years);
    const next = { ...current, expiresAt: expires.toISOString(), status: "ACTIVE" as DomainStatus };
    const existing = store.get(domain);
    store.set(domain, { ...(existing ?? { records: defaultRecords(domain) }), ...next });
    return next;
  }

  async transferDomain(domain: string, _authCode: string, _privacy = true) {
    const info: DomainInfo = {
      domain,
      status: "PENDING_TRANSFER",
      registeredAt: null,
      expiresAt: yearsFromNow(1),
      autoRenew: true,
      nameservers: [],
      providerRef: `mock-xfer-${domain}`,
    };
    store.set(domain, { ...info, records: defaultRecords(domain) });
    return info;
  }

  async cancelInboundTransfer(domain: string) {
    const existing = store.get(domain);
    if (existing) existing.status = "FAILED";
  }

  async cancelOutboundTransfer(domain: string) {
    const existing = store.get(domain);
    if (existing) existing.status = "ACTIVE";
  }

  async getDomainStatus(domain: string) {
    const info = await this.getDomain(domain);
    return info?.status ?? "FAILED";
  }

  async updateNameservers(domain: string, nameservers: string[]) {
    const existing = store.get(domain);
    if (!existing) throw new Error("DOMAIN_NOT_FOUND");
    existing.nameservers = nameservers;
    store.set(domain, existing);
    return nameservers;
  }

  async getDnsRecords(domain: string) {
    seedIfMissing(domain);
    return store.get(domain)?.records ?? [];
  }

  async updateDnsRecords(domain: string, records: DnsRecordInput[]) {
    seedIfMissing(domain);
    const existing = store.get(domain);
    if (!existing) throw new Error("DOMAIN_NOT_FOUND");
    existing.records = records.map((record) => ({
      id: randomUUID(),
      ttl: 3600,
      ...record,
    }));
    store.set(domain, existing);
    return existing.records;
  }

  async deleteDnsRecord(domain: string, recordId: string) {
    const existing = store.get(domain);
    if (!existing) return;
    existing.records = existing.records.filter((record) => record.id !== recordId);
    store.set(domain, existing);
  }

  async getDomainExpiration(domain: string) {
    return (await this.getDomain(domain))?.expiresAt ?? null;
  }

  async getDomainAutoRenewStatus(domain: string) {
    return (await this.getDomain(domain))?.autoRenew ?? false;
  }

  async setDomainAutoRenew(domain: string, enabled: boolean) {
    const existing = store.get(domain);
    if (!existing) throw new Error("DOMAIN_NOT_FOUND");
    existing.autoRenew = enabled;
    store.set(domain, existing);
    return enabled;
  }

  async setDomainLock(domain: string, locked: boolean) {
    const existing = store.get(domain);
    if (!existing) throw new Error("DOMAIN_NOT_FOUND");
    existing.status = locked ? "LOCKED" : "ACTIVE";
    store.set(domain, existing);
    return locked;
  }

  async setDomainPrivacy(domain: string, _enabled: boolean) {
    const existing = store.get(domain);
    if (!existing) throw new Error("DOMAIN_NOT_FOUND");
    return _enabled;
  }

  async getAuthCode(domain: string) {
    if (!store.has(domain) && !TAKEN.has(domain)) throw new Error("DOMAIN_NOT_FOUND");
    return "MOCK-AUTH-CODE";
  }

  async deleteDomain(domain: string) {
    store.delete(domain);
    TAKEN.delete(domain);
  }
}

export const mockDomainProvider = new MockDomainProvider();
