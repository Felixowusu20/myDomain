import { namecomIdempotencyKey, namecomRequest } from "@/lib/providers/namecom/client";

export type NamecomSearchResult = {
  domainName?: string;
  purchasable?: boolean;
  premium?: boolean;
  purchasePrice?: number;
  renewalPrice?: number;
  transferPrice?: number;
  purchaseType?: string;
};

export type NamecomDomain = {
  domainName?: string;
  createDate?: string;
  expireDate?: string;
  autorenewEnabled?: boolean;
  locked?: boolean;
  privacyEnabled?: boolean;
  nameservers?: string[];
  contacts?: unknown;
};

export type NamecomRecord = {
  id?: number;
  type?: string | null;
  host?: string | null;
  answer?: string;
  ttl?: number;
  priority?: number;
};

export type NamecomTldPrice = {
  tld?: string;
  duration?: number;
  registrationPrice?: number | null;
  registrationRetailPrice?: number | null;
  registrationOriginalPrice?: number | null;
  renewalPrice?: number | null;
  renewalRetailPrice?: number | null;
  renewalOriginalPrice?: number | null;
  domainRestorationPrice?: number | null;
  domainRestorationRetailPrice?: number | null;
  domainRestorationOriginalPrice?: number | null;
  transferInPrice?: number | null;
  transferInRetailPrice?: number | null;
  transferInOriginalPrice?: number | null;
};

export const NAMECOM_WEBHOOK_EVENTS = [
  "account.credit.balance_change",
  "account.domain.removal",
  "domain.lock.status_change",
  "domain.transfer.status_change",
  "domain.transfer_out.status_change",
  "contact.verification.status_change",
  "domain.transfer.internal_in",
  "domain.transfer.internal_out",
  "domain.registry.rejection",
  "domain.expiration",
] as const;

export function namecomHello() {
  return namecomRequest("GET", "/hello");
}

export function namecomBalance() {
  return namecomRequest<{ balance?: number }>("GET", "/accountinfo/balance");
}

export function namecomCheckAvailability(domainNames: string[], purchaseType = "registration") {
  return namecomRequest<{ results?: NamecomSearchResult[] }>("POST", "/domains:checkAvailability", {
    domainNames,
    purchaseType,
  });
}

export function namecomSearch(keyword: string, tldFilter?: string[]) {
  return namecomRequest<{ results?: NamecomSearchResult[] }>("POST", "/domains:search", {
    keyword,
    tldFilter,
    purchaseType: "registration",
    timeout: 2500,
  });
}

export function namecomCreateDomain(body: Record<string, unknown>, idempotencyKey?: string) {
  return namecomRequest<{ domain?: NamecomDomain; order?: number; totalPaid?: number }>(
    "POST",
    "/domains",
    body,
    { idempotencyKey: namecomIdempotencyKey(idempotencyKey) },
  );
}

export function namecomGetDomain(domain: string) {
  return namecomRequest<NamecomDomain & { domain?: NamecomDomain }>(
    "GET",
    `/domains/${encodeURIComponent(domain)}`,
  );
}

export function namecomListDomains(page = 1, perPage = 100) {
  return namecomRequest<{
    domains?: NamecomDomain[];
    lastPage?: number;
    nextPage?: number;
    totalCount?: number;
  }>("GET", `/domains?page=${page}&perPage=${perPage}`);
}

export function namecomUpdateDomain(
  domain: string,
  patch: { autorenewEnabled?: boolean; locked?: boolean; privacyEnabled?: boolean },
) {
  return namecomRequest<{ domain?: NamecomDomain }>(
    "PATCH",
    `/domains/${encodeURIComponent(domain)}`,
    patch,
  );
}

export function namecomGetPricing(domain: string, years = 1) {
  return namecomRequest<{
    purchasePrice?: number;
    renewalPrice?: number;
    transferPrice?: number;
    premium?: boolean;
  }>("GET", `/domains/${encodeURIComponent(domain)}:getPricing?years=${years}`);
}

export function namecomRenewDomain(domain: string, years: number, purchasePrice?: number) {
  const body: Record<string, unknown> = { years };
  if (purchasePrice != null) body.purchasePrice = purchasePrice;
  return namecomRequest<{ domain?: NamecomDomain }>(
    "POST",
    `/domains/${encodeURIComponent(domain)}:renew`,
    body,
  );
}

export function namecomGetAuthCode(domain: string) {
  return namecomRequest<{ authCode?: string }>(
    "GET",
    `/domains/${encodeURIComponent(domain)}:getAuthCode`,
  );
}

export function namecomPurchasePrivacy(domain: string) {
  return namecomRequest("POST", `/domains/${encodeURIComponent(domain)}:purchasePrivacy`, {});
}

export function namecomSetNameservers(domain: string, nameservers: string[]) {
  return namecomRequest<{ nameservers?: string[] }>(
    "POST",
    `/domains/${encodeURIComponent(domain)}:setNameservers`,
    { nameservers },
  );
}

export function namecomSetContacts(domain: string, contacts: unknown) {
  return namecomRequest("POST", `/domains/${encodeURIComponent(domain)}:setContacts`, { contacts });
}

export function namecomListRecords(domain: string) {
  return namecomRequest<{ records?: NamecomRecord[] }>(
    "GET",
    `/domains/${encodeURIComponent(domain)}/records?perPage=1000`,
  );
}

export function namecomGetRecord(domain: string, recordId: string) {
  return namecomRequest<NamecomRecord>(
    "GET",
    `/domains/${encodeURIComponent(domain)}/records/${recordId}`,
  );
}

export function namecomCreateRecord(domain: string, record: Record<string, unknown>) {
  return namecomRequest<NamecomRecord>(
    "POST",
    `/domains/${encodeURIComponent(domain)}/records`,
    record,
  );
}

export function namecomUpdateRecord(domain: string, recordId: string, record: Record<string, unknown>) {
  return namecomRequest<NamecomRecord>(
    "PUT",
    `/domains/${encodeURIComponent(domain)}/records/${recordId}`,
    record,
  );
}

export function namecomDeleteRecord(domain: string, recordId: string) {
  return namecomRequest("DELETE", `/domains/${encodeURIComponent(domain)}/records/${recordId}`);
}

export type NamecomTransfer = {
  domainName?: string;
  email?: string;
  status?: string;
};

export type NamecomUnverifiedContact = {
  verificationId?: number;
  email?: string;
  domains?: string[];
  verifyBy?: string;
  createDate?: string;
};

export function namecomZoneCheck(domainNames: string[]) {
  return namecomRequest<{ results?: { domainName?: string; available?: boolean }[]; removed?: number }>(
    "POST",
    "/zonecheck",
    { domainNames },
  );
}

export function namecomTldRequirements(tld: string) {
  return namecomRequest<{
    tldInfo?: {
      tld?: string;
      supportsTransferLock?: boolean;
      supportsPrivacy?: boolean;
      supportsPremium?: boolean;
    };
  }>("GET", `/domaininfo/requirements/${encodeURIComponent(tld.replace(/^\./, ""))}`);
}

export function namecomCreateTransfer(
  domainName: string,
  authCode: string,
  options?: { purchasePrice?: number; privacyEnabled?: boolean },
) {
  const body: Record<string, unknown> = { domainName, authCode };
  if (options?.purchasePrice != null) body.purchasePrice = options.purchasePrice;
  if (options?.privacyEnabled != null) body.privacyEnabled = options.privacyEnabled;
  return namecomRequest<{ transfer?: NamecomTransfer } & NamecomTransfer>("POST", "/transfers", body);
}

export function namecomCreateInternalTransfer(
  domainName: string,
  authCode: string,
  options?: { privacyEnabled?: boolean },
) {
  const body: Record<string, unknown> = { domainName, authCode };
  if (options?.privacyEnabled != null) body.privacyEnabled = options.privacyEnabled;
  return namecomRequest<{ transfer?: NamecomTransfer } & NamecomTransfer>(
    "POST",
    "/transfers/internal/in",
    body,
  );
}

export function namecomListTransfers(page = 1, perPage = 100) {
  return namecomRequest<{ transfers?: NamecomTransfer[]; nextPage?: number; totalCount?: number }>(
    "GET",
    `/transfers?page=${page}&perPage=${perPage}`,
  );
}

export function namecomGetTransfer(domain: string) {
  return namecomRequest<NamecomTransfer>(
    "GET",
    `/transfers/${encodeURIComponent(domain)}`,
  );
}

export function namecomTransferEligibility(domain: string) {
  return namecomRequest<{
    domainName?: string;
    atName?: boolean;
    supportsInternalTransfer?: boolean;
  }>("GET", `/transfers/eligibility/${encodeURIComponent(domain)}`);
}

export function namecomCancelTransfer(domain: string) {
  return namecomRequest<NamecomTransfer>(
    "POST",
    `/transfers/${encodeURIComponent(domain)}:cancel`,
    {},
  );
}

export function namecomCancelTransferOut(domain: string) {
  return namecomRequest<{ domainName?: string; status?: string }>(
    "POST",
    `/transfers/external/out/${encodeURIComponent(domain)}:cancel`,
    {},
  );
}

export function namecomTldPrices(options?: {
  tlds?: string[];
  duration?: number;
  page?: number;
  perPage?: number;
}) {
  const query = new URLSearchParams({
    duration: String(options?.duration ?? 1),
    page: String(options?.page ?? 1),
    perPage: String(options?.perPage ?? 1000),
  });
  for (const tld of options?.tlds ?? []) {
    const value = tld.replace(/^\./, "").trim();
    if (value) query.append("tlds", value);
  }
  return namecomRequest<{
    pricing?: NamecomTldPrice[];
    nextPage?: number | null;
    lastPage?: number;
    totalCount?: number;
  }>("GET", `/tldpricing?${query.toString()}`);
}

export function namecomListOrders(page = 1) {
  return namecomRequest<{ orders?: { id?: number; createDate?: string }[]; totalCount?: number }>(
    "GET",
    `/orders?page=${page}&perPage=50`,
  );
}

export function namecomGetOrder(orderId: number) {
  return namecomRequest<{ id?: number; items?: unknown[] }>("GET", `/orders/${orderId}`);
}

export function namecomUnverifiedContacts(page = 1) {
  return namecomRequest<{ unverifiedContacts?: NamecomUnverifiedContact[]; totalCount?: number }>(
    "GET",
    `/contacts/unverified?page=${page}&perPage=100`,
  );
}

export function namecomResendVerification(verificationId: number) {
  return namecomRequest<{ sent?: boolean; verificationId?: number; nextEligibleAt?: string }>(
    "POST",
    `/contacts/verify/${verificationId}:resend`,
    {},
  );
}

export function namecomSubscribeWebhook(eventName: string, url: string) {
  return namecomRequest<{ id?: number }>("POST", "/notifications", {
    eventName,
    url,
    active: true,
  });
}

export function namecomListWebhooks() {
  return namecomRequest<{
    subscriptions?: { id?: number; eventName?: string; url?: string; active?: boolean }[];
  }>("GET", "/notifications");
}

export function namecomDeleteWebhook(id: number) {
  return namecomRequest("DELETE", `/notifications/${id}`);
}
