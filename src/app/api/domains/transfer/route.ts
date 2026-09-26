import { z } from "zod";
import { jsonCreated, jsonError } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { quoteDomainTransfer } from "@/lib/services/domain.service";
import { addCartItem } from "@/lib/services/billing.service";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

const schema = z.object({
  domain: z.string().min(3),
  authCode: z.string().min(2, "Enter the transfer authorization code from the current registrar."),
  privacy: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    if (!rateLimit(`domain-transfer:${session.customerId}:${clientIp(request)}`, 12, 60_000).ok) {
      return jsonError("Too many requests. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const quote = await quoteDomainTransfer(body.domain);
    const privacy = body.privacy ?? true;
    await addCartItem(session.customerId, {
      type: "DOMAIN_TRANSFER",
      description: `${quote.domain} · Transfer in`,
      amountCents: quote.retailCents,
      meta: {
        domain: quote.domain,
        authCode: body.authCode.trim(),
        privacy,
        years: 1,
      },
    });
    if (privacy) {
      await addCartItem(session.customerId, {
        type: "PRIVACY",
        description: "Privacy Protection",
        amountCents: 500,
        meta: { domain: quote.domain, privacy: true },
      });
    }
    return jsonCreated({ ok: true, domain: quote.domain });
  } catch (error) {
    return handleRouteError(error);
  }
}
