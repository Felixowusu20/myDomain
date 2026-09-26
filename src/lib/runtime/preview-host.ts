/** Edge-safe helpers — do not import Node-only modules (dotenv, fs, etc.). */

export function getPreviewRootDomain() {
  return (process.env.PREVIEW_ROOT_DOMAIN?.trim() || "lvh.me").replace(/^\.+/, "");
}

export function parsePreviewSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0]?.toLowerCase() ?? "";
  const root = getPreviewRootDomain().toLowerCase();
  if (!root || !host.endsWith(`.${root}`)) return null;
  const slug = host.slice(0, -(root.length + 1));
  return /^[a-z0-9_-]+$/i.test(slug) ? slug : null;
}
