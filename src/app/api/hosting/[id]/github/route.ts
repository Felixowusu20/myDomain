import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { publicHosting, updateHostingProject } from "@/lib/services/hosting.service";

const schema = z.object({
  githubRepo: z.string().min(1),
  githubBranch: z.string().min(1).optional(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireCustomer();
    const { id } = await context.params;
    const body = schema.parse(await request.json());
    const account = await updateHostingProject({
      customerId: session.customerId,
      hostingId: id,
      githubRepo: body.githubRepo,
      githubBranch: body.githubBranch,
    });
    if (!account) return jsonError("We couldn't find that item.", 404);
    return jsonOk({ account: publicHosting(account) });
  } catch (error) {
    return handleRouteError(error);
  }
}
