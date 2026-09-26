import { z } from "zod";
import { jsonCreated } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { publicHosting, startGithubTrialDeploy } from "@/lib/services/hosting.service";

const schema = z.object({
  githubRepo: z.string().min(1),
  githubBranch: z.string().min(1).optional(),
  rootDirectory: z.string().optional(),
  envVars: z
    .array(z.object({ key: z.string(), value: z.string() }))
    .max(50)
    .optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireCustomer();
    const body = schema.parse(await request.json());
    const account = await startGithubTrialDeploy({
      customerId: session.customerId,
      userId: session.sub,
      githubRepo: body.githubRepo,
      githubBranch: body.githubBranch,
      rootDirectory: body.rootDirectory,
      envVars: body.envVars,
      actorId: session.sub,
    });
    return jsonCreated({ account: publicHosting(account) });
  } catch (error) {
    return handleRouteError(error);
  }
}
