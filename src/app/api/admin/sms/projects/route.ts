import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { createApiProject } from "@/lib/services/api-project.service";

const schema = z.object({
  customerId: z.string().min(1),
  name: z.string().min(2).max(80),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await request.json());
    const project = await createApiProject({
      customerId: body.customerId,
      name: body.name,
      actorId: admin.sub,
    });
    return jsonOk({
      project: {
        id: project.id,
        name: project.name,
        customerId: project.customerId,
        defaultSender: project.defaultSender,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
