import { z } from "zod";
import { jsonCreated, jsonError } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { searchDomains } from "@/lib/services/domain.service";
import { addCartItem } from "@/lib/services/billing.service";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

const schema = z.object({
  domain: z.string().min(3),
  years: z.number().int().min(1).max(10).optional(),
  privacy: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    if (!rateLimit(`domain-register:${session.customerId}:${clientIp(request)}`, 30, 60_000).ok) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const search = await searchDomains(body.domain);
    const fqdn = body.domain.trim().toLowerCase();
    const match = search.results.find((item) => item.domain === fqdn);
    if (!match?.available) {
      return jsonError(search.message ?? "That domain is no longer available. Try one of these alternatives.");
    }
    const years = body.years ?? 1;
    const privacy = body.privacy ?? true;
    await addCartItem(session.customerId, {
      type: "DOMAIN_REGISTRATION",
      description: `${match.domain} · Registration, ${years} year`,
      amountCents: match.retailCents * years,
      meta: { domain: match.domain, years, privacy: false },
    });
    if (privacy) {
      await addCartItem(session.customerId, {
        type: "PRIVACY",
        description: "Privacy Protection",
        amountCents: 500,
        meta: { domain: match.domain, privacy: true },
      });
    }
    return jsonCreated({ ok: true, domain: match.domain });
  } catch (error) {
    return handleRouteError(error);
  }
}
