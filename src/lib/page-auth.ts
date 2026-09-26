import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession, SESSION_COOKIE, ADMIN_SESSION_COOKIE } from "@/lib/session";
import { verifyEmailPath } from "@/lib/email-otp";

export async function getCustomerContext() {
  const session = await getSession(SESSION_COOKIE);
  if (!session || session.role !== "CUSTOMER") redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { customer: true },
  });
  if (!user?.customer || user.status === "SUSPENDED") redirect("/login");
  if (!user.emailVerifiedAt) redirect(verifyEmailPath(user.email));
  return { user, customerId: user.customer.id };
}

export async function getAdminContext() {
  const session = await getSession(ADMIN_SESSION_COOKIE);
  if (!session || session.role !== "ADMIN") redirect("/admin/login");
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    include: { adminProfile: true },
  });
  if (!user?.adminProfile) redirect("/admin/login");
  if (!user.emailVerifiedAt) redirect(verifyEmailPath(user.email));
  return { user };
}
