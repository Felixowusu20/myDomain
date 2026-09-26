import { jsonError, jsonOk } from "@/lib/api";
import { handleRouteError } from "@/lib/route";
import { rateLimit } from "@/lib/rate-limit";
import { searchDomains } from "@/lib/services/domain.service";

export async function GET(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for") ?? "local";
    if (!rateLimit(`search:${ip}`, 80).ok) {
      return jsonError("Too many searches. Please wait a moment.", 429);
    }
    const q = new URL(request.url).searchParams.get("q") ?? "";
    const suggestions = new URL(request.url).searchParams.get("quick") !== "1";
    return jsonOk(await searchDomains(q, true, { suggestions }));
  } catch (error) {
    return handleRouteError(error);
  }
}
