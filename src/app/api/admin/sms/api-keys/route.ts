import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { createProjectApiKey } from "@/lib/services/api-project.service";

const schema = z.object({
  projectId: z.string().min(1, "Choose a project before creating a key."),
  name: z.string().trim().min(2, "Key name must be at least 2 characters.").max(80),
  scopes: z.array(z.string()).min(1, "Choose at least one permission."),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await request.json());
    const key = await createProjectApiKey({
      projectId: body.projectId,
      name: body.name,
      scopes: body.scopes,
      actorId: admin.sub,
    });
    return jsonOk({ key });
  } catch (error) {
    return handleRouteError(error);
  }
}
