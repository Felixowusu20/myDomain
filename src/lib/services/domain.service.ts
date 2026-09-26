import { prisma } from "@/lib/db";
import { getDomainProvider, getDnsProvider, getNotificationProvider } from "@/lib/providers";
import { customerErrors } from "@/lib/api";
import { normalizeDomain, parseJson, tldFromDomain } from "@/lib/utils";
import { extractSearchName, extractTldFromQuery } from "@/lib/tlds";
import { audit } from "@/lib/audit";
import { assertBilledRegistrarAction } from "@/lib/security/billing-gates";

export async function searchDomains(
  query: string,
  customerView = true,
  options?: { suggestions?: boolean },
) {
  const sld = extractSearchName(query);
  if (sld.length < 2) {
    throw new Error("Enter a name like myshop");
  }

  const [owned, providerResults, tlds] = await Promise.all([
    prisma.domain.findMany({ select: { name: true } }),
    getDomainProvider().searchDomain(sld, options),
    prisma.tldPricing.findMany({ where: { status: "Active" } }),
  ]);
  const ownedNames = new Set(owned.map((item) => String(item.name)));
  const priceMap = new Map(tlds.map((tld) => [String(tld.tld), tld]));
  const typedTld = extractTldFromQuery(query);
  const exactDomain = typedTld ? `${sld}${typedTld}` : "";

  const results = providerResults
    .map((item) => {
      const pricing = priceMap.get(item.tld);
      const taken = ownedNames.has(item.domain) || !item.available;
      return {
        domain: item.domain,
        tld: item.tld,
        available: !taken,
        retailCents: customerView
          ? (pricing?.retailCents as number | undefined) ?? item.retailCents ?? 2500
          : (pricing?.retailCents as number | undefined) ?? item.retailCents ?? 2500,
        wholesaleCents: customerView ? undefined : item.wholesaleCents ?? (pricing?.wholesaleCents as number | undefined),
        reason: taken ? ("taken" as const) : undefined,
      };
    })
    .sort((a, b) => {
      if (exactDomain) {
        if (a.domain === exactDomain && b.domain !== exactDomain) return -1;
        if (b.domain === exactDomain && a.domain !== exactDomain) return 1;
      }
      if (typedTld) {
        if (a.tld === typedTld && b.tld !== typedTld) return -1;
        if (b.tld === typedTld && a.tld !== typedTld) return 1;
      }
      if (a.available !== b.available) return a.available ? -1 : 1;
      return a.tld.localeCompare(b.tld);
    });

  const availableCount = results.filter((item) => item.available).length;

  return {
    sld,
    results,
    availableCount,
    takenCount: results.length - availableCount,
    message: availableCount ? null : customerErrors.domainUnavailable,
  };
}

export function serializeDomain(domain: {
  id: string;
  name: string;
  tld: string;
  status: string;
  registeredAt: Date | null;
  expiresAt: Date | null;
  autoRenew: boolean;
  nameserversJson: string;
  locked: boolean;
  privacyEnabled: boolean;
  customerId: string;
  dnsRecords?: {
    id: string;
    type: string;
    host: string;
    value: string;
    ttl: number;
    priority: number | null;
  }[];
  hostingAccounts?: { id: string; status: string; plan: { name: string } }[];
}) {
  return {
    id: domain.id,
    name: domain.name,
    tld: domain.tld,
    status: domain.status,
    registeredAt: domain.registeredAt,
    expiresAt: domain.expiresAt,
    autoRenew: domain.autoRenew,
    nameservers: parseJson<string[]>(domain.nameserversJson, []),
    locked: domain.locked,
    privacyEnabled: domain.privacyEnabled,
    dnsRecords: domain.dnsRecords ?? [],
    hosting:
      domain.hostingAccounts?.map((account) => ({
        id: account.id,
        status: account.status,
        plan: account.plan.name,
      })) ?? [],
  };
}

export async function listCustomerDomains(customerId: string) {
  const domains = await prisma.domain.findMany({
    where: { customerId },
    include: { dnsRecords: true, hostingAccounts: { include: { plan: true } } },
    orderBy: { createdAt: "desc" },
  });
  return domains.map(serializeDomain);
}

export async function getCustomerDomain(customerId: string, id: string) {
  const domain = await prisma.domain.findFirst({
    where: { id, customerId },
    include: { dnsRecords: { orderBy: { type: "asc" } }, hostingAccounts: { include: { plan: true } } },
  });
  return domain ? serializeDomain(domain) : null;
}

export async function registerPurchasedDomain(input: {
  customerId: string;
  domainName: string;
  years: number;
  privacy: boolean;
  orderId: string;
  actorId?: string;
}) {
  const name = normalizeDomain(input.domainName);
  const tld = tldFromDomain(name);
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: { user: true },
  });
  if (!customer) throw new Error("Customer not found");

  const provider = getDomainProvider();
  const domainProviderRow = await prisma.provider.findFirst({
    where: { type: "DOMAIN" },
  });
  if (!domainProviderRow) throw new Error("Domain provider is not configured");

  let registered;
  try {
    registered = await provider.registerDomain({
      domain: name,
      years: input.years,
      customerEmail: customer.user.email,
      privacy: input.privacy,
    });
  } catch {
    await prisma.domain.create({
      data: {
        name,
        tld,
        customerId: input.customerId,
        status: "PENDING_REGISTRATION",
        autoRenew: true,
        privacyEnabled: input.privacy,
        providerId: domainProviderRow.id,
        registrations: {
          create: {
            orderId: input.orderId,
            years: input.years,
            status: "PENDING",
          },
        },
      },
    });
    throw new Error("REGISTRATION_PENDING");
  }

  const dns = await getDnsProvider().getDnsRecords(name);
  const domain = await prisma.domain.create({
    data: {
      name,
      tld,
      customerId: input.customerId,
      status: "ACTIVE",
      registeredAt: registered.registeredAt ? new Date(registered.registeredAt) : new Date(),
      expiresAt: registered.expiresAt ? new Date(registered.expiresAt) : null,
      autoRenew: registered.autoRenew,
      nameserversJson: JSON.stringify(registered.nameservers),
      privacyEnabled: input.privacy,
      providerId: domainProviderRow.id,
      providerRef: registered.providerRef,
      registrations: {
        create: {
          orderId: input.orderId,
          years: input.years,
          status: "ACTIVE",
          providerRef: registered.providerRef,
        },
      },
      dnsRecords: {
        create: dns.map((record) => ({
          type: record.type,
          host: record.host,
          value: record.value,
          ttl: record.ttl ?? 3600,
          priority: record.priority ?? null,
          providerRef: record.id,
        })),
      },
      contacts: {
        create: {
          type: "registrant",
          firstName: customer.user.name.split(" ")[0] ?? "Customer",
          lastName: customer.user.name.split(" ").slice(1).join(" ") || "Account",
          email: customer.user.email,
          phone: customer.user.phone,
        },
      },
    },
    include: { dnsRecords: true, hostingAccounts: { include: { plan: true } } },
  });

  const pricing = await prisma.tldPricing.findUnique({ where: { tld } });
  await prisma.renewal.create({
    data: {
      customerId: input.customerId,
      resourceType: "DOMAIN",
      resourceId: domain.id,
      label: name,
      dueAt: domain.expiresAt ?? new Date(),
      amountCents: pricing?.renewalCents ?? 2500,
      autoRenew: true,
    },
  });
  await prisma.subscription.create({
    data: {
      customerId: input.customerId,
      type: "DOMAIN",
      resourceId: domain.id,
      label: name,
      renewsAt: domain.expiresAt ?? new Date(),
      amountCents: pricing?.renewalCents ?? 2500,
    },
  });

  await getNotificationProvider().send({
    to: customer.user.email,
    event: "domain_registered",
    title: "Domain registered",
    body: `${name} is now active in your dashboard.`,
  });
  await prisma.notification.create({
    data: {
      customerId: input.customerId,
      event: "domain_registered",
      title: "Domain registered",
      body: `${name} is now active.`,
    },
  });
  await audit({
    actorId: input.actorId,
    action: "domain.register",
    entityType: "Domain",
    entityId: domain.id,
    metadata: { name },
  });

  return serializeDomain(domain);
}

export async function renewCustomerDomain(customerId: string, domainId: string, years = 1) {
  assertBilledRegistrarAction("renewal");
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;
  const updated = await getDomainProvider().renewDomain(domain.name, years);
  return prisma.domain.update({
    where: { id: domain.id },
    data: {
      expiresAt: updated.expiresAt ? new Date(updated.expiresAt) : domain.expiresAt,
      status: "ACTIVE",
    },
  });
}

export async function setAutoRenew(customerId: string, domainId: string, enabled: boolean) {
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;
  await getDomainProvider().setDomainAutoRenew(domain.name, enabled);
  return prisma.domain.update({
    where: { id: domain.id },
    data: { autoRenew: enabled },
  });
}

export async function updateNameservers(
  customerId: string,
  domainId: string,
  nameservers: string[],
) {
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;
  const next = nameservers.filter(Boolean).slice(0, 4);
  await getDomainProvider().updateNameservers(domain.name, next);
  return prisma.domain.update({
    where: { id: domain.id },
    data: { nameserversJson: JSON.stringify(next) },
  });
}

export async function addDnsRecord(
  customerId: string,
  domainId: string,
  record: { type: string; host: string; value: string; ttl?: number; priority?: number | null },
) {
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;
  const created = await getDnsProvider().createDnsRecord(domain.name, {
    type: record.type as "A",
    host: record.host,
    value: record.value,
    ttl: record.ttl,
    priority: record.priority,
  });
  return prisma.dnsRecord.create({
    data: {
      domainId: domain.id,
      type: created.type,
      host: created.host,
      value: created.value,
      ttl: created.ttl ?? 3600,
      priority: created.priority ?? null,
      providerRef: created.id,
    },
  });
}

function sameDnsHost(a: string, b: string) {
  const normalize = (host: string) => {
    const value = host.trim().toLowerCase();
    return value === "" || value === "@" ? "@" : value.replace(/\.$/, "");
  };
  return normalize(a) === normalize(b);
}

/** Point a purchased domain at Vercel (or paste custom www CNAME from the Vercel domain card). */
export async function connectDomainToVercel(
  customerId: string,
  domainId: string,
  input: {
    method: "records" | "nameservers";
    wwwCname?: string;
    actorId?: string;
  },
) {
  const { vercelDnsPlan, vercelNameserverPlan } = await import("@/lib/vercel-dns");
  const domain = await prisma.domain.findFirst({
    where: { id: domainId, customerId },
    include: { dnsRecords: true },
  });
  if (!domain) return null;
  if (domain.status !== "ACTIVE" && domain.status !== "LOCKED") {
    throw new Error("Domain must be active before you can connect it.");
  }

  if (input.method === "nameservers") {
    const plan = vercelNameserverPlan();
    await getDomainProvider().updateNameservers(domain.name, plan.nameservers);
    const updated = await prisma.domain.update({
      where: { id: domain.id },
      data: { nameserversJson: JSON.stringify(plan.nameservers) },
      include: { dnsRecords: true },
    });
    if (input.actorId) {
      await audit({
        actorId: input.actorId,
        action: "domain.connect_vercel_nameservers",
        entityType: "Domain",
        entityId: domain.id,
        metadata: { nameservers: plan.nameservers },
      });
    }
    return { method: "nameservers" as const, domain: serializeDomain(updated), plan };
  }

  const plan = vercelDnsPlan(input.wwwCname);
  const dns = getDnsProvider();
  const conflicting = domain.dnsRecords.filter(
    (record) =>
      (sameDnsHost(record.host, "@") && ["A", "AAAA", "CNAME"].includes(record.type)) ||
      (sameDnsHost(record.host, "www") && ["A", "AAAA", "CNAME"].includes(record.type)),
  );

  for (const record of conflicting) {
    await dns.deleteDnsRecord(domain.name, record.providerRef ?? record.id);
    await prisma.dnsRecord.delete({ where: { id: record.id } });
  }

  const createdRows = [];
  for (const desired of plan.records) {
    const created = await dns.createDnsRecord(domain.name, {
      type: desired.type,
      host: desired.host,
      value: desired.value,
      ttl: desired.ttl,
    });
    createdRows.push(
      await prisma.dnsRecord.create({
        data: {
          domainId: domain.id,
          type: created.type,
          host: created.host,
          value: created.value,
          ttl: created.ttl ?? desired.ttl,
          priority: created.priority ?? null,
          providerRef: created.id,
        },
      }),
    );
  }

  const refreshed = await prisma.domain.findFirstOrThrow({
    where: { id: domain.id },
    include: { dnsRecords: { orderBy: { type: "asc" } }, hostingAccounts: { include: { plan: true } } },
  });

  if (input.actorId) {
    await audit({
      actorId: input.actorId,
      action: "domain.connect_vercel_records",
      entityType: "Domain",
      entityId: domain.id,
      metadata: { records: plan.records },
    });
  }

  return {
    method: "records" as const,
    domain: serializeDomain(refreshed),
    plan,
    applied: createdRows,
  };
}

export async function updateDnsRecord(
  customerId: string,
  domainId: string,
  recordId: string,
  record: { type: string; host: string; value: string; ttl?: number; priority?: number | null },
) {
  const existing = await prisma.dnsRecord.findFirst({
    where: { id: recordId, domain: { id: domainId, customerId } },
    include: { domain: true },
  });
  if (!existing) return null;
  const created = await getDnsProvider().updateDnsRecord(existing.domain.name, existing.providerRef ?? recordId, {
    type: record.type as "A",
    host: record.host,
    value: record.value,
    ttl: record.ttl,
    priority: record.priority,
  });
  return prisma.dnsRecord.update({
    where: { id: recordId },
    data: {
      type: created.type,
      host: created.host,
      value: created.value,
      ttl: created.ttl ?? existing.ttl,
      priority: created.priority ?? null,
      providerRef: created.id,
    },
  });
}

export async function deleteDnsRecord(customerId: string, domainId: string, recordId: string) {
  const existing = await prisma.dnsRecord.findFirst({
    where: { id: recordId, domain: { id: domainId, customerId } },
    include: { domain: true },
  });
  if (!existing) return false;
  await getDnsProvider().deleteDnsRecord(existing.domain.name, existing.providerRef ?? recordId);
  await prisma.dnsRecord.delete({ where: { id: recordId } });
  return true;
}

export async function setDomainLock(customerId: string, domainId: string, locked: boolean) {
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;
  await getDomainProvider().setDomainLock(domain.name, locked);
  return prisma.domain.update({
    where: { id: domain.id },
    data: { locked, status: locked ? "LOCKED" : "ACTIVE" },
  });
}

export async function setDomainPrivacy(customerId: string, domainId: string, enabled: boolean) {
  if (enabled) {
    assertBilledRegistrarAction("privacy");
  }
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;
  await getDomainProvider().setDomainPrivacy(domain.name, enabled);
  return prisma.domain.update({
    where: { id: domain.id },
    data: { privacyEnabled: enabled },
  });
}

export async function getDomainAuthCode(customerId: string, domainId: string) {
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;
  return getDomainProvider().getAuthCode(domain.name);
}

export async function quoteDomainTransfer(domainName: string) {
  const name = normalizeDomain(domainName);
  if (!name.includes(".")) throw new Error("Enter a full domain, like mybusiness.com");
  const availability = await getDomainProvider().checkAvailability(name);
  if (availability.available) {
    throw new Error("That domain is available to register. Add it from search instead.");
  }
  const tld = tldFromDomain(name);
  const pricing = await prisma.tldPricing.findUnique({ where: { tld } });
  return {
    domain: name,
    tld,
    retailCents: pricing?.transferCents ?? 2000,
  };
}

export async function transferPurchasedDomain(input: {
  customerId: string;
  domainName: string;
  authCode: string;
  privacy: boolean;
  orderId: string;
  actorId?: string;
}) {
  const name = normalizeDomain(input.domainName);
  const tld = tldFromDomain(name);
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    include: { user: true },
  });
  if (!customer) throw new Error("Customer not found");
  const existing = await prisma.domain.findUnique({ where: { name } });
  if (existing) throw new Error("That domain is already on this platform.");

  const domainProviderRow = await prisma.provider.findFirst({ where: { type: "DOMAIN" } });
  if (!domainProviderRow) throw new Error("Domain provider is not configured");

  try {
    await getDomainProvider().transferDomain(name, input.authCode, input.privacy);
  } catch {
    await prisma.domain.create({
      data: {
        name,
        tld,
        customerId: input.customerId,
        status: "PENDING_TRANSFER",
        autoRenew: true,
        privacyEnabled: input.privacy,
        providerId: domainProviderRow.id,
        registrations: {
          create: {
            orderId: input.orderId,
            years: 1,
            status: "PENDING",
          },
        },
      },
    });
    throw new Error("TRANSFER_PENDING");
  }

  const domain = await prisma.domain.create({
    data: {
      name,
      tld,
      customerId: input.customerId,
      status: "PENDING_TRANSFER",
      autoRenew: true,
      privacyEnabled: input.privacy,
      providerId: domainProviderRow.id,
      providerRef: name,
      registrations: {
        create: {
          orderId: input.orderId,
          years: 1,
          status: "PENDING",
          providerRef: name,
        },
      },
      contacts: {
        create: {
          type: "registrant",
          firstName: customer.user.name.split(" ")[0] ?? "Customer",
          lastName: customer.user.name.split(" ").slice(1).join(" ") || "Account",
          email: customer.user.email,
          phone: customer.user.phone,
        },
      },
    },
    include: { dnsRecords: true, hostingAccounts: { include: { plan: true } } },
  });

  await getNotificationProvider().send({
    to: customer.user.email,
    event: "domain_transfer_started",
    title: "Domain transfer started",
    body: `${name} is transferring in. Unlock it at the current registrar if you have not already.`,
  });
  await audit({
    actorId: input.actorId,
    action: "domain.transfer",
    entityType: "Domain",
    entityId: domain.id,
    metadata: { name },
  });
  return serializeDomain(domain);
}

export async function cancelInboundTransfer(customerId: string, domainId: string) {
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;
  await getDomainProvider().cancelInboundTransfer(domain.name);
  return prisma.domain.update({
    where: { id: domain.id },
    data: { status: "FAILED" },
  });
}

export async function cancelOutboundTransfer(customerId: string, domainId: string) {
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;
  await getDomainProvider().cancelOutboundTransfer(domain.name);
  return prisma.domain.update({
    where: { id: domain.id },
    data: { status: domain.locked ? "LOCKED" : "ACTIVE" },
  });
}

export async function deleteCustomerDomain(
  customerId: string,
  domainId: string,
  confirmName: string,
  actorId?: string,
) {
  const domain = await prisma.domain.findFirst({ where: { id: domainId, customerId } });
  if (!domain) return null;

  const expected = domain.name.trim().toLowerCase();
  const typed = confirmName.trim().toLowerCase();
  if (!typed || typed !== expected) {
    throw new Error("Type the full domain name to confirm deletion.");
  }

  const provider = getDomainProvider();
  try {
    if (domain.status === "PENDING_TRANSFER") {
      await provider.cancelInboundTransfer(domain.name);
    }
  } catch {
    // Continue — account deletion should still succeed.
  }

  try {
    await provider.deleteDomain(domain.name);
  } catch {
    // Registrar may not support hard delete; still remove from this account.
  }

  await prisma.hostingAccount.updateMany({
    where: { domainId: domain.id },
    data: { domainId: null },
  });
  await prisma.renewal.deleteMany({
    where: {
      customerId,
      OR: [{ resourceId: domain.id }, { label: domain.name }],
    },
  });

  await prisma.domain.delete({ where: { id: domain.id } });
  await audit({
    actorId: actorId ?? null,
    action: "domain.delete",
    entityType: "Domain",
    entityId: domain.id,
    metadata: { name: domain.name, status: domain.status },
  });

  return { ok: true as const, name: domain.name };
}
