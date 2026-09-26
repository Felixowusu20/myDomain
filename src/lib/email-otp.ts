import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/db";
import { isSmtpConfigured } from "@/lib/env";
import { sendMail } from "@/lib/email/smtp";
import { emailOtpEmail, welcomeEmail, adminWelcomeEmail } from "@/lib/email/templates";
import { getAuthSecret } from "@/lib/session";

export const OTP_MINUTES = 15;
export const OTP_TTL_MS = OTP_MINUTES * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60_000;

function otpSecret() {
  return Buffer.from(getAuthSecret()).toString("hex");
}

export function generateOtpCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function normalizeOtpCode(code: string) {
  return code.replace(/\s+/g, "").trim();
}

export function hashOtp(userId: string, code: string) {
  return createHmac("sha256", otpSecret()).update(`${userId}:${code}`).digest("hex");
}

export function otpMatches(userId: string, code: string, codeHash: string) {
  const expected = Buffer.from(hashOtp(userId, code));
  const actual = Buffer.from(codeHash);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function verifyEmailPath(email: string, expiresAt?: Date | string | null) {
  const params = new URLSearchParams({ email });
  const ms = expiresAt ? new Date(expiresAt).getTime() : NaN;
  if (Number.isFinite(ms)) params.set("expires", String(ms));
  return `/verify-email?${params.toString()}`;
}

export async function getActiveOtpExpiry(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || user.emailVerifiedAt || user.status === "SUSPENDED") return null;
  const otp = await prisma.emailOtp.findFirst({
    where: { userId: user.id, purpose: "EMAIL_VERIFY", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  return otp?.expiresAt ?? null;
}

export async function sendEmailVerificationOtp(
  user: { id: string; email: string; name: string },
  options: { force?: boolean } = {},
) {
  if (!isSmtpConfigured()) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  const latest = await prisma.emailOtp.findFirst({
    where: { userId: user.id, purpose: "EMAIL_VERIFY" },
    orderBy: { createdAt: "desc" },
  });
  if (
    !options.force &&
    latest &&
    latest.expiresAt > new Date() &&
    Date.now() - latest.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS
  ) {
    return { reused: true as const, expiresAt: latest.expiresAt };
  }

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.$transaction([
    prisma.emailOtp.deleteMany({
      where: { userId: user.id, purpose: "EMAIL_VERIFY" },
    }),
    prisma.emailOtp.create({
      data: {
        userId: user.id,
        purpose: "EMAIL_VERIFY",
        codeHash: hashOtp(user.id, code),
        expiresAt,
      },
    }),
  ]);

  const message = emailOtpEmail(user.name, code, OTP_MINUTES);
  const result = await sendMail({
    to: user.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (result.skipped) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }
  return { reused: false as const, expiresAt };
}

export async function consumeEmailOtp(userId: string, rawCode: string) {
  const code = normalizeOtpCode(rawCode);
  if (!/^\d{6}$/.test(code)) {
    return { ok: false as const, reason: "invalid" as const };
  }

  const otp = await prisma.emailOtp.findFirst({
    where: { userId, purpose: "EMAIL_VERIFY" },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt <= new Date()) {
    if (otp) {
      await prisma.emailOtp.delete({ where: { id: otp.id } });
    }
    return { ok: false as const, reason: "expired" as const };
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.emailOtp.delete({ where: { id: otp.id } });
    return { ok: false as const, reason: "locked" as const };
  }

  if (!otpMatches(userId, code, otp.codeHash)) {
    const nextAttempts = otp.attempts + 1;
    if (nextAttempts >= OTP_MAX_ATTEMPTS) {
      await prisma.emailOtp.delete({ where: { id: otp.id } });
      return { ok: false as const, reason: "locked" as const };
    }
    await prisma.emailOtp.update({
      where: { id: otp.id },
      data: { attempts: nextAttempts },
    });
    return { ok: false as const, reason: "invalid" as const };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailOtp.deleteMany({
      where: { userId, purpose: "EMAIL_VERIFY" },
    }),
  ]);
  return { ok: true as const };
}

export async function sendWelcomeAfterVerify(user: {
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
}) {
  const message = user.role === "ADMIN" ? adminWelcomeEmail(user.name) : welcomeEmail(user.name);
  void sendMail({
    to: user.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  }).catch((mailError) => console.error("Welcome email failed", mailError));
}

export function otpErrorMessage(error: unknown) {
  if (error instanceof Error && error.message === "EMAIL_NOT_CONFIGURED") {
    return "Email sending is not configured, so we cannot send a verification code.";
  }
  return null;
}
