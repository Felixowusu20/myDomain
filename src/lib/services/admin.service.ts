import { prisma } from "@/lib/db";

export async function adminDashboard() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    customers,
    domains,
    hosting,
    revenue,
    pendingOrders,
    upcomingRenewals,
    recentOrders,
    servers,
  ] = await Promise.all([
    prisma.customer.count(),
    prisma.domain.count({ where: { status: "ACTIVE" } }),
    prisma.hostingAccount.count({ where: { status: "RUNNING" } }),
    prisma.payment.aggregate({
      where: { status: "SUCCESS", createdAt: { gte: startOfMonth } },
      _sum: { amountCents: true },
    }),
    prisma.order.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.renewal.count({ where: { status: "UPCOMING" } }),
    prisma.order.findMany({
      include: { customer: { include: { user: true } }, items: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.server.findMany({ orderBy: { name: "asc" } }),
  ]);

  return {
    totalCustomers: customers,
    activeDomains: domains,
    activeHostingAccounts: hosting,
    monthlyRevenueCents: revenue._sum.amountCents ?? 0,
    pendingOrders,
    upcomingRenewals,
    recentOrders,
    servers,
  };
}
