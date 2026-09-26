import { randomUUID } from "crypto";
import type {
  HostingAccountInfo,
  HostingPlanInfo,
  HostingProvider,
  HostingStatus,
  ServerResourceInfo,
  ServerStatus,
} from "@/lib/providers/types";

const plans: HostingPlanInfo[] = [
  {
    slug: "starter",
    name: "Starter",
    yearlyCents: 6000,
    websites: 1,
    storageGb: 10,
    bandwidthGb: 100,
    databases: 1,
    sslIncluded: true,
    description: "One website, 10 GB storage, 100 GB bandwidth, 1 database, Free SSL",
  },
  {
    slug: "business",
    name: "Business",
    yearlyCents: 12000,
    websites: 5,
    storageGb: 50,
    bandwidthGb: 500,
    databases: 10,
    sslIncluded: true,
    description: "Five websites, 50 GB storage, 500 GB bandwidth, 10 databases, Free SSL",
  },
  {
    slug: "pro",
    name: "Pro",
    yearlyCents: 25000,
    websites: -1,
    storageGb: 100,
    bandwidthGb: 1000,
    databases: -1,
    sslIncluded: true,
    description: "Unlimited websites, 100 GB storage, 1 TB bandwidth, unlimited databases, Free SSL",
  },
];

const servers: Record<string, ServerResourceInfo> = {
  "GHA-01": {
    serverName: "GHA-01",
    location: "Accra",
    status: "RUNNING",
    ipAddress: "192.0.2.10",
    cpuPercent: 18,
    ramPercent: 42,
    diskPercent: 31,
    bandwidthPercent: 24,
    uptimePercent: 99.98,
  },
  "GHA-02": {
    serverName: "GHA-02",
    location: "Accra",
    status: "RUNNING",
    ipAddress: "192.0.2.20",
    cpuPercent: 27,
    ramPercent: 51,
    diskPercent: 44,
    bandwidthPercent: 33,
    uptimePercent: 99.95,
  },
  "GHA-03": {
    serverName: "GHA-03",
    location: "Accra",
    status: "WARNING",
    ipAddress: "192.0.2.30",
    cpuPercent: 78,
    ramPercent: 81,
    diskPercent: 69,
    bandwidthPercent: 71,
    uptimePercent: 99.41,
  },
};

const accounts = new Map<string, HostingAccountInfo>();

export class MockHostingProvider implements HostingProvider {
  async getHostingPlans() {
    return plans;
  }

  async createHostingAccount(input: {
    planSlug: string;
    domain?: string;
    customerEmail: string;
  }) {
    const plan = plans.find((item) => item.slug === input.planSlug) ?? plans[1];
    const server = servers["GHA-01"];
    const providerRef = `mock-host-${randomUUID()}`;
    const account: HostingAccountInfo = {
      providerRef,
      status: "RUNNING",
      username: `${(input.domain ?? "site").split(".")[0]}.mock`,
      password: "mock-pass-not-real",
      serverName: server.serverName,
      ipAddress: server.ipAddress,
    };
    accounts.set(providerRef, account);
    return account;
  }

  async getHostingAccount(providerRef: string) {
    return accounts.get(providerRef) ?? null;
  }

  async suspendHostingAccount(providerRef: string) {
    const account = accounts.get(providerRef);
    if (account) account.status = "SUSPENDED";
  }

  async unsuspendHostingAccount(providerRef: string) {
    const account = accounts.get(providerRef);
    if (account) account.status = "RUNNING";
  }

  async terminateHostingAccount(providerRef: string) {
    const account = accounts.get(providerRef);
    if (account) account.status = "TERMINATED";
  }

  async getHostingStatus(providerRef: string): Promise<HostingStatus> {
    return accounts.get(providerRef)?.status ?? "ERROR";
  }

  async getServerStatus(serverName: string): Promise<ServerStatus> {
    return servers[serverName]?.status ?? "OFFLINE";
  }

  async getServerResources(serverName: string) {
    return servers[serverName] ?? servers["GHA-01"];
  }

  async getHostingCredentials(providerRef: string) {
    const account = accounts.get(providerRef);
    return {
      username: account?.username ?? "mock-user",
      password: account?.password ?? "mock-pass-not-real",
    };
  }
}

export const mockHostingProvider = new MockHostingProvider();
