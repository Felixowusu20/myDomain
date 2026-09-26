import { cookies } from "next/headers";
import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { issueSession, publicUser } from "@/lib/session";
import {
  CUSTOMER_TOTP_PENDING_COOKIE,
  verifyCustomerTotpPendingToken,
} from "@/lib/security/customer-totp-pending";
import { verifyCustomerTotpLogin } from "@/lib/services/customer-totp.service";

const schema = z.object({
  pendingToken: z.string().min(20).optional(),
  code: z.string().min(6).max(24),
});

export async function POST(request: Request) {
  try {
    if (!rateLimit(`customer-totp-login:${clientIp(request)}`, 12, 60_000).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const jar = await cookies();
    const token = body.pendingToken || jar.get(CUSTOMER_TOTP_PENDING_COOKIE)?.value;
    if (!token) return jsonError("That sign-in link expired. Sign in again.", 401);
    const userId = await verifyCustomerTotpPendingToken(token);
    if (!userId) return jsonError("That sign-in link expired. Sign in again.", 401);
    const user = await verifyCustomerTotpLogin(userId, body.code);
    await issueSession(user);
    jar.delete(CUSTOMER_TOTP_PENDING_COOKIE);
    return jsonOk({ user: publicUser(user), redirectTo: "/dashboard" });
  } catch (error) {
    return handleRouteError(error);
  }
}
