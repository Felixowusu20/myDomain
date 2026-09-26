import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { Role } from "@/lib/models";
import { authSecretBytes } from "@/lib/security/auth-secret";

export const SESSION_COOKIE = "mydomain_session";
export const ADMIN_SESSION_COOKIE = "mydomain_admin_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  customerId?: string;
  adminId?: string;
  avatarUrl?: string;
};

export function getAuthSecret() {
  return authSecretBytes();
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  if (!hash) return false;
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: SessionPayload, days = 7) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
    customerId: payload.customerId,
    adminId: payload.adminId,
    avatarUrl: payload.avatarUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${days}d`)
    .sign(getAuthSecret());
}

export async function createResetToken(userId: string) {
  return new SignJWT({ purpose: "reset" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getAuthSecret());
}

export async function verifyResetToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (payload.purpose !== "reset" || typeof payload.sub !== "string") return null;
    return payload.sub;
  } catch {
    return null;
  }
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: String(payload.name ?? ""),
      role: payload.role as Role,
      customerId:
        typeof payload.customerId === "string" ? payload.customerId : undefined,
      adminId: typeof payload.adminId === "string" ? payload.adminId : undefined,
      avatarUrl:
        typeof payload.avatarUrl === "string" ? payload.avatarUrl : undefined,
    };
  } catch {
    return null;
  }
}

export async function setSessionCookie(
  cookieName: string,
  token: string,
  days = 7,
) {
  const jar = await cookies();
  jar.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: days * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(cookieName: string) {
  const jar = await cookies();
  jar.delete(cookieName);
}

export async function getSession(
  cookieName: string = SESSION_COOKIE,
): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function issueSession(user: {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string | null;
  emailVerifiedAt?: Date | string | null;
  customer?: { id: string } | null;
  adminProfile?: { id: string } | null;
}) {
  if (!user.emailVerifiedAt) {
    throw new Error("Cannot issue a session before email verification.");
  }
  const token = await createToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    customerId: user.customer?.id,
    adminId: user.adminProfile?.id,
    avatarUrl: user.avatarUrl ?? undefined,
  });
  await setSessionCookie(
    user.role === "ADMIN" ? ADMIN_SESSION_COOKIE : SESSION_COOKIE,
    token,
  );
}

export function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string | null;
  status?: string;
  avatarUrl?: string | null;
  emailVerifiedAt?: Date | string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone ?? "",
    status: user.status ?? "ACTIVE",
    avatarUrl: user.avatarUrl ?? "",
    emailVerified: Boolean(user.emailVerifiedAt),
  };
}
