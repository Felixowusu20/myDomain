import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { addSenderId, disableSenderId } from "@/lib/services/api-project.service";

const schema = z.object({
  projectId: z.string().min(1),
  value: z.string().min(1).max(11),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = schema.parse(await request.json());
    const sender = await addSenderId({
      projectId: body.projectId,
      value: body.value,
      actorId: admin.sub,
    });
    return jsonOk({ sender: { id: sender.id, value: sender.value, status: sender.status } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await requireAdmin();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) return jsonError("Sender ID not found.", 404);
    await disableSenderId(id, admin.sub);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
