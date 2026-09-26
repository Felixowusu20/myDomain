import { z } from "zod";
import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireAdmin } from "@/lib/guard";
import { namecomResendVerification, namecomUnverifiedContacts } from "@/lib/providers/namecom/api";

const schema = z.object({
  verificationId: z.number().int().positive(),
});

export async function GET() {
  try {
    await requireAdmin();
    const data = await namecomUnverifiedContacts(1);
    return jsonOk({
      contacts: data.unverifiedContacts ?? [],
      totalCount: data.totalCount ?? 0,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = schema.parse(await request.json());
    const result = await namecomResendVerification(body.verificationId);
    return jsonOk(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
