import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { issueSession, publicUser, verifyPassword } from "@/lib/session";
import {
  otpErrorMessage,
  sendEmailVerificationOtp,
  verifyEmailPath,
} from "@/lib/email-otp";
import { createAdminTotpPendingToken } from "@/lib/security/admin-totp-pending";
import { createCustomerTotpPendingToken } from "@/lib/security/customer-totp-pending";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  portal: z.enum(["customer", "admin"]).optional(),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`login:${ip}`, 12).ok) {
      return jsonError("Too many sign in attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const portal = body.portal ?? "customer";
    const user = await prisma.user.findUnique({
      where: { email },
      include: { customer: true, adminProfile: true },
    });
    if (!user) return jsonError("Invalid email or password.", 401);
    if (!user.passwordHash) {
      return jsonError("This account uses GitHub. Continue with GitHub to sign in.", 401);
    }
    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) return jsonError("Invalid email or password.", 401);
    if (user.status === "SUSPENDED") {
      return jsonError("This account has been suspended.", 403);
    }

    if (portal === "admin" && (user.role !== "ADMIN" || !user.adminProfile)) {
      return jsonError("This account does not have admin access.", 403);
    }

    if (!user.emailVerifiedAt) {
      try {
        const sent = await sendEmailVerificationOtp(user);
        return jsonOk({
          user: publicUser(user),
          needsVerification: true,
          expiresAt: sent.expiresAt.toISOString(),
          redirectTo: verifyEmailPath(user.email, sent.expiresAt),
          message: "Verify your email with the 6 digit code we sent you.",
        });
      } catch (error) {
        const configured = otpErrorMessage(error);
        if (configured) return jsonError(configured, 503);
        throw error;
      }
    }

    if ((portal === "admin" || user.role === "ADMIN") && user.adminProfile?.totpEnabled) {
      const pendingToken = await createAdminTotpPendingToken(user.id);
      return jsonOk({
        needsTotp: true,
        pendingToken,
        message: "Enter the 6-digit code from your authenticator app.",
      });
    }

    if (portal === "admin" || user.role === "ADMIN") {
      await issueSession(user);
      return jsonOk({ user: publicUser(user), redirectTo: "/admin" });
    }

    if (user.customer?.totpEnabled) {
      const pendingToken = await createCustomerTotpPendingToken(user.id);
      return jsonOk({
        needsTotp: true,
        pendingToken,
        message: "Enter the 6-digit code from your authenticator app.",
      });
    }

    await issueSession(user);
    return jsonOk({ user: publicUser(user), redirectTo: "/dashboard" });
  } catch (error) {
    return handleRouteError(error);
  }
}
