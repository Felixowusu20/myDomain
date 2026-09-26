import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import {
  beginCustomerTotpSetup,
  disableCustomerTotp,
  enableCustomerTotp,
  getCustomerTotpStatus,
} from "@/lib/services/customer-totp.service";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export async function GET() {
  try {
    const session = await requireCustomer();
    return jsonOk(await getCustomerTotpStatus(session.sub));
  } catch (error) {
    return handleRouteError(error);
  }
}

const beginSchema = z.object({ action: z.literal("begin") });
const enableSchema = z.object({
  action: z.literal("enable"),
  secret: z.string().min(16),
  setupToken: z.string().min(32),
  code: z.string().min(6).max(12),
});
const disableSchema = z.object({
  action: z.literal("disable"),
  code: z.string().min(6).max(24),
});

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    if (!rateLimit(`customer-totp:${session.sub}:${clientIp(request)}`, 20, 60_000).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = await request.json();
    const action = body?.action;

    if (action === "begin") {
      beginSchema.parse(body);
      const setup = await beginCustomerTotpSetup(session.sub, session.email);
      return jsonOk(setup);
    }
    if (action === "enable") {
      const parsed = enableSchema.parse(body);
      const result = await enableCustomerTotp({
        userId: session.sub,
        actorId: session.sub,
        secret: parsed.secret,
        setupToken: parsed.setupToken,
        code: parsed.code,
      });
      return jsonOk(result);
    }
    if (action === "disable") {
      const parsed = disableSchema.parse(body);
      const result = await disableCustomerTotp({
        userId: session.sub,
        actorId: session.sub,
        code: parsed.code,
      });
      return jsonOk(result);
    }
    return jsonError("Unknown action.", 400);
  } catch (error) {
    return handleRouteError(error);
  }
}
