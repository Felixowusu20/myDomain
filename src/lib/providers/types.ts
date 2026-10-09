export type DomainStatus =
  | "ACTIVE"
  | "PENDING_REGISTRATION"
  | "PENDING_TRANSFER"
  | "EXPIRED"
  | "SUSPENDED"
  | "LOCKED"
  | "FAILED";

export type HostingStatus =
  | "RUNNING"
  | "PROVISIONING"
  | "SUSPENDED"
  | "TERMINATED"
  | "ERROR"
  | "OFFLINE";

export type ServerStatus = "RUNNING" | "WARNING" | "OFFLINE" | "MAINTENANCE";

export type DnsRecordInput = {
  type: "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS";
  host: string;
  value: string;
  ttl?: number;
  priority?: number | null;
};

export type DnsRecordResult = DnsRecordInput & {
  id: string;
};

export type DomainSearchResult = {
  domain: string;
  tld: string;
  available: boolean;
  retailCents: number | null;
  wholesaleCents?: number | null;
  reason?: "registered" | "taken";
};

export type DomainInfo = {
  domain: string;
  status: DomainStatus;
  registeredAt: string | null;
  expiresAt: string | null;
  autoRenew: boolean;
  nameservers: string[];
  providerRef: string;
  locked?: boolean;
  privacyEnabled?: boolean;
};

export type HostingPlanInfo = {
  slug: string;
  name: string;
  yearlyCents: number;
  websites: number;
  storageGb: number;
  bandwidthGb: number;
  databases: number;
  sslIncluded: boolean;
  description: string;
};

export type HostingAccountInfo = {
  providerRef: string;
  status: HostingStatus;
  username: string;
  password: string;
  serverName: string;
  ipAddress: string;
};

export type ServerResourceInfo = {
  serverName: string;
  location: string;
  status: ServerStatus;
  ipAddress: string;
  cpuPercent: number;
  ramPercent: number;
  diskPercent: number;
  bandwidthPercent: number;
  uptimePercent: number;
};

export type PaymentRequest = {
  amountCents: number;
  currency?: string;
  method?: string;
  metadata?: Record<string, unknown>;
};

export type PaymentResult = {
  id: string;
  status: "SUCCESS" | "FAILED" | "PENDING" | "REFUNDED";
  amountCents: number;
  providerRef: string;
};

export interface DomainProvider {
  searchDomain(query: string, options?: { suggestions?: boolean; tld?: string }): Promise<DomainSearchResult[]>;
  checkAvailability(domain: string): Promise<{ available: boolean; reason?: string }>;
  getDomain(domain: string): Promise<DomainInfo | null>;
  registerDomain(input: {
    domain: string;
    years: number;
    customerEmail: string;
    privacy?: boolean;
  }): Promise<DomainInfo>;
  renewDomain(domain: string, years: number): Promise<DomainInfo>;
  transferDomain(domain: string, authCode: string, privacy?: boolean): Promise<DomainInfo>;
  cancelInboundTransfer(domain: string): Promise<void>;
  cancelOutboundTransfer(domain: string): Promise<void>;
  getDomainStatus(domain: string): Promise<DomainStatus>;
  updateNameservers(domain: string, nameservers: string[]): Promise<string[]>;
  getDnsRecords(domain: string): Promise<DnsRecordResult[]>;
  updateDnsRecords(domain: string, records: DnsRecordInput[]): Promise<DnsRecordResult[]>;
  deleteDnsRecord(domain: string, recordId: string): Promise<void>;
  getDomainExpiration(domain: string): Promise<string | null>;
  getDomainAutoRenewStatus(domain: string): Promise<boolean>;
  setDomainAutoRenew(domain: string, enabled: boolean): Promise<boolean>;
  setDomainLock(domain: string, locked: boolean): Promise<boolean>;
  setDomainPrivacy(domain: string, enabled: boolean): Promise<boolean>;
  getAuthCode(domain: string): Promise<string>;
  /** Permanently remove the domain from the registrar inventory when supported. */
  deleteDomain(domain: string): Promise<void>;
}

export interface HostingProvider {
  getHostingPlans(): Promise<HostingPlanInfo[]>;
  createHostingAccount(input: {
    planSlug: string;
    domain?: string;
    customerEmail: string;
  }): Promise<HostingAccountInfo>;
  getHostingAccount(providerRef: string): Promise<HostingAccountInfo | null>;
  suspendHostingAccount(providerRef: string): Promise<void>;
  unsuspendHostingAccount(providerRef: string): Promise<void>;
  terminateHostingAccount(providerRef: string): Promise<void>;
  getHostingStatus(providerRef: string): Promise<HostingStatus>;
  getServerStatus(serverName: string): Promise<ServerStatus>;
  getServerResources(serverName: string): Promise<ServerResourceInfo>;
  getHostingCredentials(providerRef: string): Promise<{
    username: string;
    password: string;
  }>;
}

export interface DnsProvider {
  getDnsRecords(domain: string): Promise<DnsRecordResult[]>;
  createDnsRecord(domain: string, record: DnsRecordInput): Promise<DnsRecordResult>;
  updateDnsRecord(
    domain: string,
    recordId: string,
    record: DnsRecordInput,
  ): Promise<DnsRecordResult>;
  deleteDnsRecord(domain: string, recordId: string): Promise<void>;
}

export interface PaymentProvider {
  createPayment(input: PaymentRequest): Promise<PaymentResult>;
  verifyPayment(providerRef: string): Promise<PaymentResult>;
  getPayment(providerRef: string): Promise<PaymentResult | null>;
  refundPayment(providerRef: string): Promise<PaymentResult>;
}

export interface NotificationProvider {
  send(input: {
    to?: string;
    event: string;
    title: string;
    body: string;
    channel?: "email" | "sms" | "whatsapp" | "in_app";
  }): Promise<void>;
}
