import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { adminExists } from "@/lib/auth-profile";
import { hashPassword, publicUser } from "@/lib/session";
import { isPasswordStrongEnough } from "@/lib/password-strength";
import {
  otpErrorMessage,
  sendEmailVerificationOtp,
  verifyEmailPath,
} from "@/lib/email-otp";

export async function GET() {
  try {
    return jsonOk({ hasAdmin: await adminExists() });
  } catch (error) {
    return handleRouteError(error);
  }
}

const schema = z
  .object({
    name: z.string().min(2, "Please enter your name."),
    email: z.string().email("Please enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().optional(),
  })
  .refine((value) => isPasswordStrongEnough(value.password), {
    message: "Choose a stronger password.",
    path: ["password"],
  })
  .refine((value) => !value.confirmPassword || value.confirmPassword === value.password, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function POST(request: Request) {
  try {
    if (await adminExists()) {
      return jsonError("An administrator already exists. Sign in instead.", 409);
    }
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`bootstrap-admin:${ip}`, 6).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return jsonError("An account with this email already exists.", 409);
    }

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash: await hashPassword(body.password),
        role: "ADMIN",
        adminProfile: { create: {} },
      },
      include: { customer: true, adminProfile: true },
    });

    let expiresAt: Date | undefined;
    try {
      const sent = await sendEmailVerificationOtp(user, { force: true });
      expiresAt = sent.expiresAt;
    } catch (error) {
      const configured = otpErrorMessage(error);
      if (configured) {
        await prisma.user.delete({ where: { id: user.id } });
        return jsonError(configured, 503);
      }
      console.error("Admin verification email failed", error);
    }

    return jsonCreated({
      user: publicUser(user),
      needsVerification: true,
      expiresAt: expiresAt?.toISOString() ?? null,
      redirectTo: verifyEmailPath(user.email, expiresAt),
      message: "We sent a 6 digit code to your email. Enter it to activate admin access.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
