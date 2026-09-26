import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import {
  getActiveOtpExpiry,
  otpErrorMessage,
  sendEmailVerificationOtp,
  verifyEmailPath,
} from "@/lib/email-otp";

const schema = z.object({
  email: z.string().email(),
});

export async function GET(request: Request) {
  try {
    const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!email) return jsonOk({ expiresAt: null });
    const expiresAt = await getActiveOtpExpiry(email);
    return jsonOk({ expiresAt: expiresAt?.toISOString() ?? null });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`resend-otp:${ip}`, 6, 10 * 60_000).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && !user.emailVerifiedAt && user.status !== "SUSPENDED") {
      try {
        const result = await sendEmailVerificationOtp(user);
        if (result.reused) {
          return jsonOk({
            ok: true,
            expiresAt: result.expiresAt.toISOString(),
            redirectTo: verifyEmailPath(email, result.expiresAt),
            message: "We already sent a code. Wait a minute before requesting another, or use the one in your inbox.",
          });
        }
        return jsonOk({
          ok: true,
          expiresAt: result.expiresAt.toISOString(),
          redirectTo: verifyEmailPath(email, result.expiresAt),
          message: "We sent a new 6 digit code. It expires in 15 minutes.",
        });
      } catch (error) {
        const configured = otpErrorMessage(error);
        if (configured) return jsonError(configured, 503);
        throw error;
      }
    }
    const expiresAt = await getActiveOtpExpiry(email);
    return jsonOk({
      ok: true,
      expiresAt: expiresAt?.toISOString() ?? null,
      redirectTo: verifyEmailPath(email, expiresAt),
      message: "If that email needs verification, we sent a new code.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
