import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { disconnectGithub, getGithubConnection } from "@/lib/services/github.service";
import { isGithubConfigured } from "@/lib/github/config";

export async function GET() {
  try {
    const session = await requireCustomer();
    const connection = await getGithubConnection(session.sub);
    return jsonOk({ configured: isGithubConfigured(), ...connection });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE() {
  try {
    const session = await requireCustomer();
    await disconnectGithub(session.sub);
    return jsonOk({ connected: false });
  } catch (error) {
    return handleRouteError(error);
  }
}
