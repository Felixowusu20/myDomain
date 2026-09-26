import { NextResponse } from "next/server";
import { getPublicPreview } from "@/lib/services/hosting.service";
import { decodeGithubFile, GithubError, type GithubContentItem } from "@/lib/github/api";
import { getGithubPreviewFile } from "@/lib/services/github.service";
import { readArtifactFile } from "@/lib/workers/container-build";
import { proxyToRuntime } from "@/lib/workers/container-runtime";

function previewPath(rootDirectory: string, path: string) {
  const clean = path.replace(/^\/+/, "").replace(/\.\.+/g, "");
  return rootDirectory ? `${rootDirectory}/${clean}` : clean;
}

function rewriteDocument(html: string, slug: string) {
  const assetBase = `/p/${encodeURIComponent(slug)}/asset/`;
  const withBase = html.replace(/<head([^>]*)>/i, `<head$1><base href="${assetBase}">`);
  return withBase.replace(/\b(src|href)=(['"])([^'"]+)\2/gi, (match, attribute, quote, value) => {
    if (/^(data:|https?:|#|mailto:|javascript:|\/\/)/i.test(value)) return match;
    return `${attribute}=${quote}${assetBase}${value.replace(/^\.\//, "")}${quote}`;
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const site = await getPublicPreview(slug);
  if (!site?.githubRepo || !site.customer?.userId) {
    return new NextResponse("Preview not found", { status: 404 });
  }
  if (
    site.status === "SUSPENDED" ||
    site.status === "TERMINATED" ||
    (site.isTrial && site.trialEndsAt && site.trialEndsAt.getTime() <= Date.now())
  ) {
    return new NextResponse("This preview has ended", { status: 410 });
  }

  if (site.runtimeMode === "server" && site.runtimePort) {
    if (site.previewUrl) {
      return NextResponse.redirect(site.previewUrl, 307);
    }
    try {
      return await proxyToRuntime({ hostPort: site.runtimePort, path: "/", request });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upstream runtime unavailable.";
      return new NextResponse(message, { status: 502 });
    }
  }

  const path = request.url.includes("?")
    ? new URL(request.url).searchParams.get("path") || "index.html"
    : "index.html";
  try {
    const artifact = await readArtifactFile(slug, path);
    const file = artifact
      ? null
      : await getGithubPreviewFile({
          userId: site.customer.userId,
          repo: site.githubRepo,
          branch: site.githubBranch,
          path: previewPath(site.rootDirectory, path),
        });
    const html = artifact?.toString("utf8") ?? decodeGithubFile(file as GithubContentItem);
    if (!html) return new NextResponse("The repository does not contain an index.html file.", { status: 404 });
    return new NextResponse(rewriteDocument(html, slug), {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof GithubError ? error.message : "Could not load this preview.";
    return new NextResponse(message, { status: error instanceof GithubError ? error.status : 502 });
  }
}
