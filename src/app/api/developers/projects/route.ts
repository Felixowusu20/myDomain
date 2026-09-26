import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { createApiProject } from "@/lib/services/api-project.service";

const schema = z.object({
  name: z.string().min(2).max(80),
});

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    if (!rateLimit(`dev-project:${session.customerId}:${clientIp(request)}`, 10, 60_000).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    const project = await createApiProject({
      customerId: session.customerId,
      name: body.name,
      actorId: session.sub,
    });
    return jsonOk({
      project: {
        id: project.id,
        name: project.name,
        defaultSender: project.defaultSender,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
