import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { issueSession, publicUser } from "@/lib/session";
import { verifyAdminTotpPendingToken } from "@/lib/security/admin-totp-pending";
import { verifyAdminTotpLogin } from "@/lib/services/admin-totp.service";

const schema = z.object({
  pendingToken: z.string().min(20),
  code: z.string().min(6).max(24),
});

export async function POST(request: Request) {
  try {
    if (!rateLimit(`admin-totp-login:${clientIp(request)}`, 12, 60_000).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const userId = await verifyAdminTotpPendingToken(body.pendingToken);
    if (!userId) return jsonError("That sign-in link expired. Sign in again.", 401);
    const user = await verifyAdminTotpLogin(userId, body.code);
    await issueSession(user);
    return jsonOk({ user: publicUser(user), redirectTo: "/admin" });
  } catch (error) {
    return handleRouteError(error);
  }
}
