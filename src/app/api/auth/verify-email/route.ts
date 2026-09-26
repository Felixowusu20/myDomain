import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { issueSession, publicUser } from "@/lib/session";
import { consumeEmailOtp, sendWelcomeAfterVerify } from "@/lib/email-otp";

const schema = z.object({
  email: z.string().email(),
  code: z.string().min(4).max(12),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`verify-email:${ip}`, 15, 10 * 60_000).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email },
      include: { customer: true, adminProfile: true },
    });
    if (!user) {
      return jsonError("That code is invalid or has expired.", 400);
    }
    if (user.status === "SUSPENDED") {
      return jsonError("This account has been suspended.", 403);
    }

    if (!user.emailVerifiedAt) {
      const result = await consumeEmailOtp(user.id, body.code);
      if (!result.ok) {
        const message =
          result.reason === "locked"
            ? "Too many incorrect codes. Request a new one."
            : result.reason === "expired"
              ? "That code has expired. Request a new one."
              : "That code is invalid or has expired.";
        return jsonError(message, 400);
      }
      sendWelcomeAfterVerify(user);
    }

    const verified = await prisma.user.findUnique({
      where: { id: user.id },
      include: { customer: true, adminProfile: true },
    });
    if (!verified?.emailVerifiedAt) {
      return jsonError("That code is invalid or has expired.", 400);
    }

    await issueSession(verified);
    return jsonOk({
      user: publicUser(verified),
      redirectTo: verified.role === "ADMIN" ? "/admin" : "/dashboard",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
