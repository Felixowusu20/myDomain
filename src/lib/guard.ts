import { prisma } from "@/lib/db";
import {
  getSession,
  SESSION_COOKIE,
  ADMIN_SESSION_COOKIE,
  type SessionPayload,
} from "@/lib/session";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireCustomer(): Promise<
  SessionPayload & { customerId: string }
> {
  const session = await getSession(SESSION_COOKIE);
  if (!session || session.role !== "CUSTOMER") {
    throw new AuthError("Please sign in to continue.");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { customer: true },
  });

  if (!user || user.status === "SUSPENDED" || !user.customer) {
    throw new AuthError("This account is not available.", 403);
  }
  if (!user.emailVerifiedAt) {
    throw new AuthError("Please verify your email to continue.", 403);
  }

  return { ...session, customerId: user.customer.id };
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession(ADMIN_SESSION_COOKIE);
  if (!session || session.role !== "ADMIN") {
    throw new AuthError("Admin access required.", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { adminProfile: true },
  });

  if (!user || user.status === "SUSPENDED" || !user.adminProfile) {
    throw new AuthError("Admin access required.", 403);
  }
  if (!user.emailVerifiedAt) {
    throw new AuthError("Please verify your email to continue.", 403);
  }

  return { ...session, adminId: user.adminProfile.id };
}
