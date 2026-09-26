import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { assertOwnedProject, createProjectApiKey } from "@/lib/services/api-project.service";

const schema = z.object({
  projectId: z.string().min(1, "Choose a project before creating a key."),
  name: z.string().trim().min(2, "Key name must be at least 2 characters.").max(80),
  scopes: z.array(z.string()).min(1, "Choose at least one permission."),
});

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    if (!rateLimit(`dev-key:${session.customerId}:${clientIp(request)}`, 20, 60_000).ok) {
      return jsonError("Too many attempts. Please wait a moment.", 429);
    }
    const body = schema.parse(await request.json());
    await assertOwnedProject(session.customerId, body.projectId);
    const key = await createProjectApiKey({
      projectId: body.projectId,
      name: body.name,
      scopes: body.scopes,
      actorId: session.sub,
    });
    return jsonOk({ key });
  } catch (error) {
    return handleRouteError(error);
  }
}
