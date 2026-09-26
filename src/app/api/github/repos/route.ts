import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { listGithubRepos } from "@/lib/services/github.service";

export async function GET(request: Request) {
  try {
    const session = await requireCustomer();
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
    return jsonOk(await listGithubRepos(session.sub, q, page));
  } catch (error) {
    return handleRouteError(error);
  }
}
