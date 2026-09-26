import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";
    const customers = await prisma.customer.findMany({
      include: {
        user: true,
        domains: true,
        hosting: true,
        orders: true,
        payments: true,
      },
      orderBy: { createdAt: "desc" },
    });
    const filtered = q
      ? customers.filter(
          (customer) =>
            customer.user.name.toLowerCase().includes(q) ||
            customer.user.email.toLowerCase().includes(q),
        )
      : customers;
    return jsonOk({
      customers: filtered.map((customer) => ({
        id: customer.id,
        name: customer.user.name,
        email: customer.user.email,
        phone: customer.user.phone,
        status: customer.user.status,
        createdAt: customer.user.createdAt,
        domains: customer.domains.length,
        hosting: customer.hosting.length,
        orders: customer.orders.length,
      })),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
