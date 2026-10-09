import { TLD_CATALOG, extractSearchName } from "@/lib/tlds";
import { namecomDefaultContacts } from "@/lib/providers/namecom/config";
import { NamecomError } from "@/lib/providers/namecom/client";
import {
  namecomCancelTransfer,
  namecomCancelTransferOut,
  namecomCheckAvailability,
  namecomCreateDomain,
  namecomCreateInternalTransfer,
  namecomCreateRecord,
  namecomCreateTransfer,
  namecomDeleteRecord,
  namecomGetAuthCode,
  namecomGetDomain,
  namecomGetPricing,
  namecomListRecords,
  namecomPurchasePrivacy,
  namecomRenewDomain,
  namecomSearch,
  namecomSetNameservers,
  namecomTransferEligibility,
  namecomUpdateDomain,
  type NamecomDomain,
  type NamecomRecord,
  type NamecomSearchResult,
} from "@/lib/providers/namecom/api";
import type {
  DnsRecordInput,
  DnsRecordResult,
  DomainInfo,
  DomainProvider,
  DomainSearchResult,
  DomainStatus,
} from "@/lib/providers/types";

function usdToCents(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

function mapStatus(domain: NamecomDomain): DomainStatus {
  if (domain.locked) return "LOCKED";
  if (domain.expireDate && new Date(domain.expireDate).getTime() < Date.now()) return "EXPIRED";
  return "ACTIVE";
}

function mapDomain(domain: NamecomDomain): DomainInfo {
  const name = (domain.domainName ?? "").toLowerCase();
  return {
    domain: name,
    status: mapStatus(domain),
    registeredAt: domain.createDate ?? null,
    expiresAt: domain.expireDate ?? null,
    autoRenew: Boolean(domain.autorenewEnabled),
    nameservers: domain.nameservers ?? [],
    providerRef: name,
    locked: Boolean(domain.locked),
    privacyEnabled: Boolean(domain.privacyEnabled),
  };
}

function mapRecord(record: NamecomRecord): DnsRecordResult {
  return {
    id: String(record.id ?? ""),
    type: (record.type ?? "A") as DnsRecordResult["type"],
    host: record.host || "@",
    value: record.answer ?? "",
    ttl: record.ttl ?? 3600,
    priority: record.priority ?? null,
  };
}

function recordBody(record: DnsRecordInput) {
  const body: Record<string, unknown> = {
    type: record.type,
    host: record.host === "@" ? "" : record.host,
    answer: record.value,
    ttl: Math.max(record.ttl ?? 300, 300),
  };
  if (record.priority != null) body.priority = record.priority;
  return body;
}

async function checkAvailability(domainNames: string[]) {
  const chunks: string[][] = [];
  for (let index = 0; index < domainNames.length; index += 50) {
    chunks.push(domainNames.slice(index, index + 50));
  }
  const rows: NamecomSearchResult[] = [];
  for (const chunk of chunks) {
    try {
      rows.push(...((await namecomCheckAvailability(chunk)).results ?? []));
    } catch (error) {
      if (error instanceof NamecomError && (error.status === 400 || error.status === 422)) continue;
      throw error;
    }
  }
  return rows;
}

const SEARCH_CACHE_MS = 3 * 60_000;
const searchCache = new Map<string, { at: number; rows: DomainSearchResult[] }>();

function catalogTldFilter(preferred?: string) {
  const ordered = [...(preferred ? [preferred] : []), ...TLD_CATALOG.map((item) => item.tld)];
  const unique: string[] = [];
  for (const tld of ordered) {
    const bare = tld.replace(/^\./, "").trim();
    if (!bare || unique.includes(bare)) continue;
    unique.push(bare);
    if (unique.length === 50) break;
  }
  return unique;
}

export class NamecomDomainProvider implements DomainProvider {
  async searchDomain(query: string, options?: { suggestions?: boolean; tld?: string }): Promise<DomainSearchResult[]> {
    const sld = extractSearchName(query);
    const filter = catalogTldFilter(options?.tld);
    const cacheKey = `${sld}:${filter.join(",")}`;
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.at < SEARCH_CACHE_MS) return cached.rows;

    let remote: NamecomSearchResult[] = [];
    try {
      remote = (await namecomSearch(sld, filter)).results ?? [];
    } catch (error) {
      if (error instanceof NamecomError && error.status === 429 && cached) return cached.rows;
      throw error;
    }
    const byName = new Map(remote.map((item) => [(item.domainName ?? "").toLowerCase(), item]));
    const checked = new Set(filter.map((tld) => (tld.startsWith(".") ? tld : `.${tld}`)));
    const catalog: DomainSearchResult[] = TLD_CATALOG.filter((item) => checked.has(item.tld)).map((item) => {
      const domain = `${sld}${item.tld}`;
      const found = byName.get(domain);
      const available = Boolean(found?.purchasable);
      return {
        domain,
        tld: item.tld,
        available,
        retailCents: usdToCents(found?.purchasePrice) ?? item.retailCents,
        wholesaleCents: usdToCents(found?.purchasePrice) ?? item.wholesaleCents,
        reason: available ? undefined : "taken",
      };
    });
    const extras = [...byName.values()]
      .map((item): DomainSearchResult | null => {
        const domain = (item.domainName ?? "").toLowerCase();
        const dot = domain.indexOf(".");
        const tld = dot >= 0 ? domain.slice(dot) : "";
        if (!domain || !tld || catalog.some((row) => row.domain === domain)) return null;
        const available = Boolean(item.purchasable);
        return {
          domain,
          tld,
          available,
          retailCents: usdToCents(item.purchasePrice) ?? 2500,
          wholesaleCents: usdToCents(item.purchasePrice),
          reason: available ? undefined : ("taken" as const),
        };
      })
      .filter((row): row is DomainSearchResult => row !== null);
    const rows = [...catalog, ...extras];
    searchCache.set(cacheKey, { at: Date.now(), rows });
    return rows;
  }

  async checkAvailability(domain: string) {
    const [result] = await checkAvailability([domain.toLowerCase()]);
    if (!result?.purchasable) return { available: false, reason: "registered" };
    return { available: true };
  }

  async getDomain(domain: string) {
    try {
      const data = await namecomGetDomain(domain);
      return mapDomain(data.domain ?? data);
    } catch (error) {
      if (typeof error === "object" && error && "status" in error && (error as { status: number }).status === 404) {
        return null;
      }
      throw error;
    }
  }

  async registerDomain(input: {
    domain: string;
    years: number;
    customerEmail: string;
    privacy?: boolean;
  }) {
    const name = input.domain.toLowerCase();
    const years = input.years || 1;
    const [discovery] = await checkAvailability([name]);
    if (!discovery?.purchasable || (discovery.purchaseType && discovery.purchaseType !== "registration")) {
      throw new Error("DOMAIN_UNAVAILABLE");
    }
    const body: Record<string, unknown> = {
      domain: {
        domainName: name,
        privacyEnabled: input.privacy ?? true,
        autorenewEnabled: true,
        locked: true,
        contacts: namecomDefaultContacts() ?? undefined,
      },
      years,
      purchaseType: "registration",
    };
    if (discovery.premium) {
      const priced = await namecomGetPricing(name, years);
      body.purchasePrice = priced.purchasePrice ?? discovery.purchasePrice;
    }
    const created = await namecomCreateDomain(body, `register:${name}:${input.customerEmail}`);
    if (!created.domain) throw new Error("DOMAIN_UNAVAILABLE");
    return mapDomain(created.domain);
  }

  async renewDomain(domain: string, years: number) {
    const priced = await namecomGetPricing(domain, years).catch(() => null);
    const data = await namecomRenewDomain(
      domain,
      years,
      priced?.premium ? priced.renewalPrice : undefined,
    );
    if (data.domain) return mapDomain(data.domain);
    const current = await this.getDomain(domain);
    if (!current) throw new Error("DOMAIN_NOT_FOUND");
    return current;
  }

  async transferDomain(domain: string, authCode: string, privacy = true) {
    const name = domain.toLowerCase();
    const priced = await namecomGetPricing(name, 1).catch(() => null);
    const eligibility = await namecomTransferEligibility(name).catch(() => null);
    const options = {
      purchasePrice: priced?.premium ? priced.transferPrice : undefined,
      privacyEnabled: privacy,
    };
    try {
      if (eligibility?.atName && eligibility.supportsInternalTransfer) {
        await namecomCreateInternalTransfer(name, authCode, { privacyEnabled: privacy });
      } else {
        await namecomCreateTransfer(name, authCode, options);
      }
    } catch (error) {
      if (
        eligibility?.atName &&
        error instanceof NamecomError &&
        (error.status === 403 || error.status === 404)
      ) {
        await namecomCreateTransfer(name, authCode, options);
      } else {
        throw error;
      }
    }
    return {
      domain: name,
      status: "PENDING_TRANSFER" as const,
      registeredAt: null,
      expiresAt: null,
      autoRenew: true,
      nameservers: [],
      providerRef: name,
      privacyEnabled: privacy,
    };
  }

  async cancelInboundTransfer(domain: string) {
    await namecomCancelTransfer(domain);
  }

  async cancelOutboundTransfer(domain: string) {
    await namecomCancelTransferOut(domain);
  }

  async getDomainStatus(domain: string) {
    return (await this.getDomain(domain))?.status ?? "FAILED";
  }

  async updateNameservers(domain: string, nameservers: string[]) {
    const data = await namecomSetNameservers(domain, nameservers);
    return data.nameservers ?? nameservers;
  }

  async getDnsRecords(domain: string) {
    const data = await namecomListRecords(domain);
    return (data.records ?? []).map(mapRecord);
  }

  async updateDnsRecords(domain: string, records: DnsRecordInput[]) {
    const existing = await this.getDnsRecords(domain);
    await Promise.all(existing.map((record) => this.deleteDnsRecord(domain, record.id)));
    const created: DnsRecordResult[] = [];
    for (const record of records) {
      created.push(mapRecord(await namecomCreateRecord(domain, recordBody(record))));
    }
    return created;
  }

  async deleteDnsRecord(domain: string, recordId: string) {
    await namecomDeleteRecord(domain, recordId);
  }

  async getDomainExpiration(domain: string) {
    return (await this.getDomain(domain))?.expiresAt ?? null;
  }

  async getDomainAutoRenewStatus(domain: string) {
    return (await this.getDomain(domain))?.autoRenew ?? false;
  }

  async setDomainAutoRenew(domain: string, enabled: boolean) {
    await namecomUpdateDomain(domain, { autorenewEnabled: enabled });
    return enabled;
  }

  async setDomainLock(domain: string, locked: boolean) {
    await namecomUpdateDomain(domain, { locked });
    return locked;
  }

  async setDomainPrivacy(domain: string, enabled: boolean) {
    if (enabled) await namecomPurchasePrivacy(domain).catch(() => undefined);
    await namecomUpdateDomain(domain, { privacyEnabled: enabled });
    return enabled;
  }

  async getAuthCode(domain: string) {
    const data = await namecomGetAuthCode(domain);
    if (!data.authCode) throw new Error("No auth code is available for this domain yet.");
    return data.authCode;
  }

  async deleteDomain(domain: string) {
    // name.com has no general delete API outside the Add Grace Period refund flow.
    // Stop renewal and unlock so the name can expire or be transferred away.
    await namecomUpdateDomain(domain, { locked: false, autorenewEnabled: false }).catch(() => undefined);
  }
}

export const namecomDomainProvider = new NamecomDomainProvider();
