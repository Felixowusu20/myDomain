import { NextResponse } from "next/server";
import { getPublicPreview } from "@/lib/services/hosting.service";
import { decodeGithubFile, GithubError, type GithubContentItem } from "@/lib/github/api";
import { getGithubPreviewFile } from "@/lib/services/github.service";
import { readArtifactFile } from "@/lib/workers/container-build";

const contentTypes: Record<string, string> = {
  css: "text/css; charset=utf-8",
  html: "text/html; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; path: string[] }> },
) {
  const { slug, path } = await params;
  const site = await getPublicPreview(slug);
  if (!site?.githubRepo || !site.customer?.userId) return new NextResponse("Asset not found", { status: 404 });
  try {
    const artifact = await readArtifactFile(slug, path.join("/"));
    const file = artifact
      ? null
      : await getGithubPreviewFile({
          userId: site.customer.userId,
          repo: site.githubRepo,
          branch: site.githubBranch,
          path: [...(site.rootDirectory ? [site.rootDirectory] : []), ...path].join("/"),
        });
    const item = file as GithubContentItem;
    const extension = path.at(-1)?.split(".").pop()?.toLowerCase() ?? "";
    const body = artifact ?? (item.encoding === "base64" && item.content
      ? Buffer.from(item.content.replaceAll("\n", ""), "base64")
      : Buffer.from(decodeGithubFile(item)));
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentTypes[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error) {
    const message = error instanceof GithubError ? error.message : "Could not load this asset.";
    return new NextResponse(message, { status: error instanceof GithubError ? error.status : 502 });
  }
}