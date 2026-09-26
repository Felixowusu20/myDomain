import { SignJWT, jwtVerify } from "jose";
import { getAuthSecret } from "@/lib/session";

const PURPOSE = "customer-2fa";
export const CUSTOMER_TOTP_PENDING_COOKIE = "mydomain_customer_2fa";

export async function createCustomerTotpPendingToken(userId: string) {
  return new SignJWT({ purpose: PURPOSE })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(getAuthSecret());
}

export async function verifyCustomerTotpPendingToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (payload.purpose !== PURPOSE || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}
