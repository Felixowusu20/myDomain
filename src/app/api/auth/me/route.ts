import { jsonError, jsonOk, unauthorized } from "@/lib/api";
import { prisma } from "@/lib/db";
import { getSession, publicUser, SESSION_COOKIE, ADMIN_SESSION_COOKIE } from "@/lib/session";

export async function GET() {
  const customer = await getSession(SESSION_COOKIE);
  const admin = await getSession(ADMIN_SESSION_COOKIE);
  const session = customer ?? admin;
  if (!session) return unauthorized();
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return unauthorized();
  if (!user.emailVerifiedAt) {
    return jsonError("Please verify your email to continue.", 403);
  }
  return jsonOk({ user: publicUser(user) });
}
