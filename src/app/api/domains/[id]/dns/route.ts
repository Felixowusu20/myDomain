import { z } from "zod";
import { jsonCreated, jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { addDnsRecord, getCustomerDomain } from "@/lib/services/domain.service";

const schema = z.object({
  type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS"]),
  host: z.string().min(1),
  value: z.string().min(1),
  ttl: z.number().int().optional(),
  priority: z.number().int().optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const domain = await getCustomerDomain(session.customerId, id);
    if (!domain) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ records: domain.dnsRecords });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const record = await addDnsRecord(session.customerId, id, body);
    if (!record) return jsonError("We couldn't find that item.", 404);
    return jsonCreated({ record });
  } catch (error) {
    return handleRouteError(error);
  }
}
