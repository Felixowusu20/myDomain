import { getNamecomConfig, isNamecomConfigured } from "@/lib/providers/namecom/config";
import {
  namecomBalance,
  namecomHello,
  namecomListDomains,
  namecomListOrders,
  namecomListTransfers,
  namecomUnverifiedContacts,
} from "@/lib/providers/namecom/api";

export async function getNamecomHealth() {
  const config = getNamecomConfig();
  if (!config) {
    return {
      configured: false,
      connected: false,
      env: null as string | null,
      baseUrl: null as string | null,
      username: null as string | null,
      message: "Add NAMECOM_USERNAME and NAMECOM_API_TOKEN in .env.local",
      balanceUsd: null as number | null,
      remoteDomains: null as number | null,
      pendingTransfers: null as number | null,
      unverifiedContacts: null as number | null,
      remoteOrders: null as number | null,
    };
  }

  try {
    await namecomHello();
    const extras = await Promise.allSettled([
      namecomBalance(),
      namecomListDomains(1, 1),
      namecomListTransfers(1, 1),
      namecomUnverifiedContacts(1),
      namecomListOrders(1),
    ]);
    const value = <T,>(index: number) =>
      extras[index]?.status === "fulfilled" ? (extras[index].value as T) : null;
    const balance = value<{ balance?: number }>(0);
    const listed = value<{ totalCount?: number; domains?: unknown[] }>(1);
    const transfers = value<{ totalCount?: number; transfers?: unknown[] }>(2);
    const contacts = value<{ totalCount?: number; unverifiedContacts?: unknown[] }>(3);
    const orders = value<{ totalCount?: number; orders?: unknown[] }>(4);

    return {
      configured: true,
      connected: true,
      env: config.env,
      baseUrl: config.baseUrl,
      username: config.username,
      message: "Connected to name.com Core API",
      balanceUsd: typeof balance?.balance === "number" ? balance.balance : null,
      remoteDomains: listed?.totalCount ?? listed?.domains?.length ?? null,
      pendingTransfers: transfers?.totalCount ?? transfers?.transfers?.length ?? null,
      unverifiedContacts: contacts?.totalCount ?? contacts?.unverifiedContacts?.length ?? null,
      remoteOrders: orders?.totalCount ?? orders?.orders?.length ?? null,
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      env: config.env,
      baseUrl: config.baseUrl,
      username: config.username,
      message: error instanceof Error ? error.message : "Could not reach name.com",
      balanceUsd: null as number | null,
      remoteDomains: null as number | null,
      pendingTransfers: null as number | null,
      unverifiedContacts: null as number | null,
      remoteOrders: null as number | null,
    };
  }
}

export function namecomDriverLabel() {
  return isNamecomConfigured() ? "namecom" : "mock";
}
