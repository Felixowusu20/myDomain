import { jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { requireCustomer } from "@/lib/guard";
import { inspectGithubRepo } from "@/lib/services/github.service";

export async function GET(request: Request) {
  try {
    const session = await requireCustomer();
    const url = new URL(request.url);
    const repo = url.searchParams.get("repo") ?? "";
    const branch = url.searchParams.get("branch") ?? undefined;
    const rootDirectory = url.searchParams.get("root") ?? undefined;
    const envKeys = (url.searchParams.get("env") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const inspection = await inspectGithubRepo({
      userId: session.sub,
      repo,
      branch,
      rootDirectory,
      envKeys,
    });
    return jsonOk(inspection);
  } catch (error) {
    return handleRouteError(error);
  }
}
