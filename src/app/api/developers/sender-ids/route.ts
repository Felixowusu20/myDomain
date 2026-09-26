import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import {
  addSenderId,
  assertOwnedProject,
  assertOwnedSender,
  disableSenderId,
} from "@/lib/services/api-project.service";

const schema = z.object({
  projectId: z.string().min(1),
  value: z.string().min(1).max(11),
});

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    const body = schema.parse(await request.json());
    await assertOwnedProject(session.customerId, body.projectId);
    const sender = await addSenderId({
      projectId: body.projectId,
      value: body.value,
      actorId: session.sub,
    });
    return jsonOk({ sender: { id: sender.id, value: sender.value, status: sender.status } });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireCustomer();
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!id) return jsonError("Sender ID not found.", 404);
    await assertOwnedSender(session.customerId, id);
    await disableSenderId(id, session.sub);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
