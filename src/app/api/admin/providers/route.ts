import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await requireAdmin();
    const providers = await prisma.provider.findMany({ orderBy: { type: "asc" } });
    return jsonOk({
      providers: providers.map((provider) => ({
        id: provider.id,
        type: provider.type,
        name: provider.name,
        driver: provider.driver,
        status: provider.status,
        lastChecked: provider.lastChecked,
        placeholders: {
          NAMECOM_USERNAME: Boolean(process.env.NAMECOM_USERNAME || process.env.DOMAIN_PROVIDER_API_KEY),
          NAMECOM_API_TOKEN: Boolean(process.env.NAMECOM_API_TOKEN || process.env.DOMAIN_PROVIDER_API_SECRET),
          NAMECOM_ENV: process.env.NAMECOM_ENV ?? "sandbox",
          HOSTING_PROVIDER_API_KEY: Boolean(process.env.HOSTING_PROVIDER_API_KEY),
          HOSTING_PROVIDER_API_SECRET: Boolean(process.env.HOSTING_PROVIDER_API_SECRET),
          PAYMENT_PROVIDER_SECRET_KEY: Boolean(process.env.PAYMENT_PROVIDER_SECRET_KEY),
        },
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
