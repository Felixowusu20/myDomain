import { prisma } from "@/lib/db";
import { isNamecomConfigured } from "@/lib/providers/namecom/config";
import {
  NAMECOM_WEBHOOK_EVENTS,
  namecomGetDomain,
  namecomListDomains,
  namecomListTransfers,
  namecomListWebhooks,
  namecomSubscribeWebhook,
  namecomTldPrices,
  type NamecomTldPrice,
} from "@/lib/providers/namecom/api";
import { getAppUrl } from "@/lib/env";
import { TLD_CATALOG } from "@/lib/tlds";

function usdToCents(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

function firstCents(...values: Array<number | null | undefined>) {
  for (const value of values) {
    if (typeof value === "number" && value > 0) return value;
  }
  return 0;
}

function asTld(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith(".") ? trimmed : `.${trimmed}`;
}

function mapTldPrice(row: NamecomTldPrice) {
  if (!row.tld) return null;
  const wholesale = usdToCents(row.registrationPrice);
  const original = usdToCents(row.registrationOriginalPrice);
  const namecomRetail = usdToCents(row.registrationRetailPrice);
  const renewalOriginal = usdToCents(row.renewalOriginalPrice);
  const renewalWholesale = usdToCents(row.renewalPrice);
  const transferOriginal = usdToCents(row.transferInOriginalPrice);
  const transferWholesale = usdToCents(row.transferInPrice);
  const restore = usdToCents(row.domainRestorationOriginalPrice) ?? usdToCents(row.domainRestorationPrice);
  const cost = firstCents(wholesale, namecomRetail, original);
  const available = cost > 0;
  return {
    tld: asTld(row.tld),
    wholesaleCents: cost,
    originalCents: firstCents(original, namecomRetail, wholesale),
    namecomRetailCents: firstCents(namecomRetail, original, wholesale),
    // Default customer price = your name.com cost until you set a margin in admin.
    retailCents: cost,
    renewalCents: firstCents(renewalWholesale, renewalOriginal, cost),
    transferCents: firstCents(transferWholesale, transferOriginal, cost),
    restoreCents: restore ?? 0,
    status: available ? "Active" : "Unavailable",
  };
}

export async function syncNamecomPricing(options?: { resetMargins?: boolean }) {
  if (!isNamecomConfigured()) throw new Error("name.com is not configured.");
  const resetMargins = options?.resetMargins === true;

  const remote = new Map<string, NonNullable<ReturnType<typeof mapTldPrice>>>();
  let page = 1;
  let totalCount = 0;
  for (;;) {
    const data = await namecomTldPrices({
      duration: 1,
      page,
      perPage: 1000,
      tlds: TLD_CATALOG.map((item) => item.tld),
    });
    totalCount = data.totalCount ?? totalCount;
    for (const row of data.pricing ?? []) {
      const mapped = mapTldPrice(row);
      if (!mapped || mapped.wholesaleCents <= 0) continue;
      // Skip name.com sandbox/test TLDs — not sellable inventory.
      if (mapped.tld.includes("mock")) continue;
      remote.set(mapped.tld, mapped);
    }
    if (!data.nextPage || data.nextPage <= page || page >= 3 || !(data.pricing ?? []).length) break;
    page = data.nextPage;
  }

  const existing = await prisma.tldPricing.findMany();
  const byTld = new Map(existing.map((row) => [row.tld, row]));
  let created = 0;
  let updated = 0;

  const rows = [...remote.values()];
  for (let index = 0; index < rows.length; index += 15) {
    const chunk = rows.slice(index, index + 15);
    await prisma.$transaction(
      chunk.map((prices) => {
        const current = byTld.get(prices.tld);
        // Keep only admin-set markups (customer price different from previous cost).
        const hadMarkup = Boolean(current && current.retailCents !== current.wholesaleCents);
        const hadRenewalMarkup = Boolean(current && current.renewalCents !== current.wholesaleCents);
        const hadTransferMarkup = Boolean(current && current.transferCents !== current.wholesaleCents);
        return prisma.tldPricing.upsert({
          where: { tld: prices.tld },
          create: prices,
          update: {
            wholesaleCents: prices.wholesaleCents,
            originalCents: prices.originalCents,
            namecomRetailCents: prices.namecomRetailCents,
            restoreCents: prices.restoreCents,
            status: prices.status,
            retailCents:
              !resetMargins && hadMarkup && current ? current.retailCents : prices.retailCents,
            renewalCents:
              !resetMargins && hadRenewalMarkup && current ? current.renewalCents : prices.renewalCents,
            transferCents:
              !resetMargins && hadTransferMarkup && current ? current.transferCents : prices.transferCents,
          },
        });
      }),
      { timeout: 60_000, maxWait: 10_000 },
    );
    for (const prices of chunk) {
      if (byTld.has(prices.tld)) updated += 1;
      else created += 1;
    }
  }

  let removed = 0;
  if (remote.size > 0) {
    const leftover = await prisma.tldPricing.deleteMany({
      where: { tld: { notIn: [...remote.keys()] } },
    });
    removed = leftover.count;
  }

  return { created, updated, removed, received: remote.size, totalCount, resetMargins };
}

export async function syncNamecomDomains() {
  if (!isNamecomConfigured()) throw new Error("name.com is not configured.");
  let page = 1;
  let synced = 0;
  for (;;) {
    const data = await namecomListDomains(page, 100);
    const domains = data.domains ?? [];
    for (const item of domains) {
      const name = (item.domainName ?? "").toLowerCase();
      if (!name) continue;
      const local = await prisma.domain.findUnique({ where: { name } });
      if (!local) continue;
      await prisma.domain.update({
        where: { id: local.id },
        data: {
          expiresAt: item.expireDate ? new Date(item.expireDate) : local.expiresAt,
          registeredAt: item.createDate ? new Date(item.createDate) : local.registeredAt,
          autoRenew: item.autorenewEnabled ?? local.autoRenew,
          locked: item.locked ?? local.locked,
          privacyEnabled: item.privacyEnabled ?? local.privacyEnabled,
          nameserversJson: item.nameservers ? JSON.stringify(item.nameservers) : local.nameserversJson,
          status: item.locked
            ? "LOCKED"
            : item.expireDate && new Date(item.expireDate).getTime() < Date.now()
              ? "EXPIRED"
              : "ACTIVE",
        },
      });
      synced += 1;
    }
    if (!data.nextPage || domains.length === 0) break;
    page = data.nextPage;
  }
  return { synced };
}

function transferStatusToLocal(status?: string) {
  const value = (status ?? "").toLowerCase();
  if (value === "completed" || value === "pending_insert") return "ACTIVE" as const;
  if (value === "failed" || value === "canceled" || value === "canceled_pending_refund") {
    return "FAILED" as const;
  }
  return "PENDING_TRANSFER" as const;
}

export async function syncNamecomTransfers() {
  if (!isNamecomConfigured()) throw new Error("name.com is not configured.");
  let page = 1;
  let synced = 0;
  for (;;) {
    const data = await namecomListTransfers(page, 100);
    const transfers = data.transfers ?? [];
    for (const item of transfers) {
      const name = (item.domainName ?? "").toLowerCase();
      if (!name) continue;
      const local = await prisma.domain.findUnique({ where: { name } });
      if (!local) continue;
      const status = transferStatusToLocal(item.status);
      if (status === "ACTIVE") {
        const live = await namecomGetDomain(name).catch(() => null);
        const domain = live?.domain ?? live;
        await prisma.domain.update({
          where: { id: local.id },
          data: {
            status: domain?.locked ? "LOCKED" : "ACTIVE",
            expiresAt: domain?.expireDate ? new Date(domain.expireDate) : local.expiresAt,
            registeredAt: domain?.createDate ? new Date(domain.createDate) : local.registeredAt,
            nameserversJson: domain?.nameservers
              ? JSON.stringify(domain.nameservers)
              : local.nameserversJson,
            locked: domain?.locked ?? local.locked,
            privacyEnabled: domain?.privacyEnabled ?? local.privacyEnabled,
          },
        });
      } else {
        await prisma.domain.update({
          where: { id: local.id },
          data: { status },
        });
      }
      synced += 1;
    }
    if (!data.nextPage || transfers.length === 0) break;
    page = data.nextPage;
  }
  return { synced };
}

export async function ensureNamecomWebhooks() {
  const url = process.env.NAMECOM_WEBHOOK_URL?.trim() || `${getAppUrl()}/api/webhooks/namecom`;
  if (!isNamecomConfigured() || url.includes("localhost")) {
    return { subscribed: 0, url };
  }
  const existing = await namecomListWebhooks().catch(() => ({ subscriptions: [] }));
  const already = new Set((existing.subscriptions ?? []).map((item) => item.eventName));
  let subscribed = 0;
  for (const eventName of NAMECOM_WEBHOOK_EVENTS) {
    if (already.has(eventName)) continue;
    try {
      await namecomSubscribeWebhook(eventName, url);
      subscribed += 1;
    } catch {
      // already subscribed or not allowed in this environment
    }
  }
  return { subscribed, url };
}
