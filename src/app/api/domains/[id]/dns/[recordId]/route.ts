import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { deleteDnsRecord, updateDnsRecord } from "@/lib/services/domain.service";

const schema = z.object({
  type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]),
  host: z.string().min(1),
  value: z.string().min(1),
  ttl: z.number().int().optional(),
  priority: z.number().int().optional(),
});

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string; recordId: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id, recordId } = await context.params;
    const body = schema.parse(await request.json());
    const record = await updateDnsRecord(session.customerId, id, recordId, body);
    if (!record) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ record });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; recordId: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id, recordId } = await context.params;
    const ok = await deleteDnsRecord(session.customerId, id, recordId);
    if (!ok) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
