import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { requireAuthSecret } from "@/lib/security/auth-secret";

function otpKey() {
  return requireAuthSecret();
}

export function generateOtpCode(length: number) {
  const digits = Math.min(8, Math.max(4, length));
  const max = 10 ** digits;
  return String(randomInt(0, max)).padStart(digits, "0");
}

export function normalizeOtpCode(code: string) {
  return code.replace(/\s+/g, "").trim();
}

export function hashOtp(projectId: string, phone: string, purpose: string, code: string) {
  return createHmac("sha256", otpKey())
    .update(`${projectId}:${phone}:${purpose}:${code}`)
    .digest("hex");
}

export function otpMatches(
  projectId: string,
  phone: string,
  purpose: string,
  code: string,
  codeHash: string,
) {
  const expected = Buffer.from(hashOtp(projectId, phone, purpose, code));
  const actual = Buffer.from(codeHash);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}
