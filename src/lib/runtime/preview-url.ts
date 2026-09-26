import { getAppUrl } from "@/lib/env";
import { getPreviewRootDomain } from "@/lib/runtime/preview-host";

export { getPreviewRootDomain, parsePreviewSlugFromHost } from "@/lib/runtime/preview-host";

export function buildPreviewUrl(input: {
  slug: string;
  runtimeMode: string;
  runtimePort?: number | null;
}) {
  if (input.runtimeMode === "server") {
    const root = getPreviewRootDomain();
    if (root) {
      const app = new URL(getAppUrl());
      const port = app.port ? `:${app.port}` : "";
      return `${app.protocol}//${input.slug}.${root}${port}`;
    }
    if (input.runtimePort) return `http://127.0.0.1:${input.runtimePort}`;
  }
  return `${getAppUrl()}/p/${input.slug}`;
}
