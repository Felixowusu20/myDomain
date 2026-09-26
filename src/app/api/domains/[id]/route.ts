import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { deleteCustomerDomain, getCustomerDomain } from "@/lib/services/domain.service";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const domain = await getCustomerDomain(session.customerId, id);
    if (!domain) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ domain });
  } catch (error) {
    return handleRouteError(error);
  }
}

const deleteSchema = z.object({
  confirmName: z.string().min(1),
});

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    if (!rateLimit(`domain-delete:${session.sub}:${clientIp(request)}`, 8, 60_000).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const { id } = await context.params;
    const body = deleteSchema.parse(await request.json());
    const result = await deleteCustomerDomain(
      session.customerId,
      id,
      body.confirmName,
      session.sub,
    );
    if (!result) return jsonError("We couldn't find that item.", 404);
    return jsonOk({
      ...result,
      redirectTo: "/domains",
      message: `${result.name} was permanently removed from your account.`,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
