import { jsonOk } from "@/lib/api";
import { isGithubConfigured } from "@/lib/github/config";

export async function GET() {
  return jsonOk({ github: isGithubConfigured() });
}
