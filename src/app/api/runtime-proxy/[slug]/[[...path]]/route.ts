import { NextRequest, NextResponse } from "next/server";
import { getPublicPreview } from "@/lib/services/hosting.service";
import { proxyToRuntime } from "@/lib/workers/container-runtime";

async function handle(request: NextRequest, context: { params: Promise<{ slug: string; path?: string[] }> }) {
  const { slug, path } = await context.params;
  const site = await getPublicPreview(slug);
  if (!site) return new NextResponse("Preview not found", { status: 404 });
  if (
    site.status === "SUSPENDED" ||
    site.status === "TERMINATED" ||
    (site.isTrial && site.trialEndsAt && site.trialEndsAt.getTime() <= Date.now())
  ) {
    return new NextResponse("This preview has ended", { status: 410 });
  }
  if (site.runtimeMode !== "server" || !site.runtimePort) {
    return new NextResponse("This site is not running a server runtime.", { status: 404 });
  }

  try {
    return await proxyToRuntime({
      hostPort: site.runtimePort,
      path: `/${(path ?? []).join("/")}`,
      request,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upstream runtime unavailable.";
    return new NextResponse(message, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
