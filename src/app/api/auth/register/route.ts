import { z } from "zod";
import { prisma } from "@/lib/db";
import { jsonCreated, jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword, publicUser } from "@/lib/session";
import { isPasswordStrongEnough } from "@/lib/password-strength";
import {
  otpErrorMessage,
  sendEmailVerificationOtp,
  verifyEmailPath,
} from "@/lib/email-otp";
import { normalizePhone } from "@/lib/messaging/phone";
import { notifyAccountCreated } from "@/lib/messaging/signup-notice";

const schema = z
  .object({
    name: z.string().min(2, "Please enter your name."),
    email: z.string().email("Please enter a valid email."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().optional(),
    phone: z.string().min(8, "Enter a phone number."),
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
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`register:${ip}`).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const email = body.email.trim().toLowerCase();
    const phone = normalizePhone(body.phone);
    const existing = await prisma.user.findUnique({
      where: { email },
      include: { customer: true, adminProfile: true },
    });
    if (existing) {
      if (existing.emailVerifiedAt) {
        return jsonError("An account with this email already exists.", 409);
      }
      if (existing.status === "SUSPENDED") {
        return jsonError("This account has been suspended.", 403);
      }
      try {
        if (existing.phone !== phone) {
          await prisma.user.update({ where: { id: existing.id }, data: { phone } });
        }
        await notifyAccountCreated({ name: existing.name, phone }).catch((error) => {
          console.error("Signup SMS failed", error);
        });
        const sent = await sendEmailVerificationOtp(existing);
        return jsonOk({
          user: publicUser(existing),
          needsVerification: true,
          resumed: true,
          expiresAt: sent.expiresAt.toISOString(),
          redirectTo: verifyEmailPath(existing.email, sent.expiresAt),
          message: "Your signup is still waiting for email verification. Enter the code we sent.",
        });
      } catch (error) {
        const configured = otpErrorMessage(error);
        if (configured) return jsonError(configured, 503);
        throw error;
      }
    }

    const user = await prisma.user.create({
      data: {
        name: body.name.trim(),
        email,
        passwordHash: await hashPassword(body.password),
        role: "CUSTOMER",
        phone,
        customer: { create: {} },
      },
      include: { customer: true, adminProfile: true },
    });

    await notifyAccountCreated({ name: user.name, phone }).catch((error) => {
      console.error("Signup SMS failed", error);
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
      console.error("Verification email failed", error);
    }

    return jsonCreated({
      user: publicUser(user),
      needsVerification: true,
      expiresAt: expiresAt?.toISOString() ?? null,
      redirectTo: verifyEmailPath(user.email, expiresAt),
      message: "We sent a 6 digit code to your email. Enter it to verify your account.",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
