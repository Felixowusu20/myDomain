import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getDatabaseUrl } from "@/lib/env";
import { seedCatalog } from "@/lib/seed-catalog";

const globalForPrisma = globalThis as typeof globalThis & {
  __mydomainPrisma?: PrismaClient;
  __mydomainPool?: Pool;
  __mydomainSeedStarted?: boolean;
};

let cachedPrisma: PrismaClient | null = null;

function isTransientDbError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: string }).code ?? "");
  const message = String((error as { message?: string }).message ?? "");
  return (
    code === "P1008" ||
    code === "P1017" ||
    /SocketTimeout|timeout|ECONNRESET|Connection terminated|too many clients/i.test(message)
  );
}

/** Retry brief Neon / pool stalls (common during aggressive deploy polling). */
export async function withDbRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
    }
  }
  throw lastError;
}

export function getPostgresPrisma() {
  if (cachedPrisma) return cachedPrisma;
  if (globalForPrisma.__mydomainPrisma) return globalForPrisma.__mydomainPrisma;

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add your Neon Postgres URI to .env.local.");
  }

  const pool =
    globalForPrisma.__mydomainPool ??
    new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 20_000,
      keepAlive: true,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__mydomainPool = pool;
  }

  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({
    adapter,
    transactionOptions: {
      maxWait: 10_000,
      timeout: 30_000,
    },
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__mydomainPrisma = client;
  } else {
    cachedPrisma = client;
  }

  if (!globalForPrisma.__mydomainSeedStarted) {
    globalForPrisma.__mydomainSeedStarted = true;
    void ensureCatalogSeed(client).catch((error) => {
      console.error("Failed to seed catalog tables", error);
    });
  }

  return client;
}

import { seedHomepageCms } from "@/lib/seed-homepage-cms";

export async function ensureCatalogSeed(client: ReturnType<typeof getPostgresPrisma>) {
  const count = await client.hostingPlan.count();
  if (count === 0) await seedCatalog(client as never);
  await seedHomepageCms(client as never);
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    try {
      const client = getPostgresPrisma();
      if (!client) {
        throw new Error("Failed to initialize Prisma client");
      }
      return (client as any)[prop];
    } catch (error) {
      console.error("Error accessing Prisma property:", prop, error);
      throw error;
    }
  },
});
