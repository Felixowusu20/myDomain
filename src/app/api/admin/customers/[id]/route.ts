import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { deleteAdminCustomer } from "@/lib/services/admin-customer.service";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

const statusSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) });
const deleteSchema = z.object({ confirmEmail: z.string().email() });

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        user: true,
        domains: true,
        hosting: { include: { plan: true, server: true } },
        orders: { include: { items: true } },
        payments: true,
      },
    });
    if (!customer) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ customer });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = statusSchema.parse(await request.json());
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return jsonError("We couldn't find that item.", 404);
    await prisma.user.update({
      where: { id: customer.userId },
      data: { status: body.status },
    });
    await audit({
      actorId: admin.sub,
      action: body.status === "SUSPENDED" ? "customer.suspend" : "customer.reactivate",
      entityType: "Customer",
      entityId: id,
    });
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    if (!rateLimit(`admin-customer-delete:${admin.sub}:${clientIp(request)}`, 10, 60_000).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const { id } = await context.params;
    const body = deleteSchema.parse(await request.json());
    const result = await deleteAdminCustomer({
      customerId: id,
      confirmEmail: body.confirmEmail,
      actorId: admin.sub,
    });
    if (!result) return jsonError("We couldn't find that item.", 404);
    return jsonOk({
      ...result,
      redirectTo: "/admin/customers",
      message: `${result.name} (${result.email}) was permanently removed.`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
