import { createHash, randomBytes, timingSafeEqual } from "crypto";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { hashPassword, verifyPassword } from "@/lib/session";
import { getAppUrl } from "@/lib/env";

const ADMIN_ISSUER = "myDomain Admin";
const CUSTOMER_ISSUER = "myDomain";

export function generateTotpSecret() {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

export function totpUri(
  email: string,
  secretBase32: string,
  issuer: string = ADMIN_ISSUER,
) {
  const totp = new OTPAuth.TOTP({
    issuer,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  return totp.toString();
}

export function customerTotpUri(email: string, secretBase32: string) {
  return totpUri(email, secretBase32, CUSTOMER_ISSUER);
}

export async function totpQrDataUrl(uri: string) {
  return QRCode.toDataURL(uri, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
    color: { dark: "#101010", light: "#ffffff" },
  });
}

export function verifyTotpCode(secretBase32: string, token: string) {
  const cleaned = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
  const delta = totp.validate({ token: cleaned, window: 1 });
  return delta !== null;
}

export function encryptTotpSecret(secretBase32: string) {
  return encryptSecret(secretBase32);
}

export function decryptTotpSecret(payload: string) {
  return decryptSecret(payload);
}

export async function createBackupCodes(count = 8) {
  const codes: string[] = [];
  const hashes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const code = randomBytes(5).toString("hex").toUpperCase();
    const formatted = `${code.slice(0, 5)}-${code.slice(5)}`;
    codes.push(formatted);
    hashes.push(await hashPassword(formatted));
  }
  return { codes, hashesJson: JSON.stringify(hashes) };
}

export async function consumeBackupCode(hashesJson: string | null | undefined, code: string) {
  if (!hashesJson) return null;
  let hashes: string[];
  try {
    hashes = JSON.parse(hashesJson) as string[];
  } catch {
    return null;
  }
  const cleaned = code.trim().toUpperCase();
  for (let i = 0; i < hashes.length; i += 1) {
    if (await verifyPassword(cleaned, hashes[i])) {
      const next = hashes.filter((_, index) => index !== i);
      return JSON.stringify(next);
    }
  }
  return null;
}

export function setupFingerprint(userId: string, secretBase32: string) {
  return createHash("sha256").update(`${userId}:${secretBase32}`).digest("hex");
}

export function timingSafeEqualHex(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function adminIssuerLabel() {
  try {
    return new URL(getAppUrl()).hostname;
  } catch {
    return "mydomain";
  }
}
