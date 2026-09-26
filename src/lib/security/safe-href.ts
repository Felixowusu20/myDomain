/** Allow relative paths or http(s) URLs only — blocks javascript: and data: hrefs. */
export function safeHttpHref(value: string | undefined | null, max = 300) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (raw.length > max) {
    throw new Error(`Link must be ${max} characters or fewer.`);
  }
  if (raw.startsWith("/") && !raw.startsWith("//")) {
    if (raw.includes("\\") || raw.includes("\0")) {
      throw new Error("Invalid link.");
    }
    return raw;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Enter a valid http(s) link or a path starting with /.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) links are allowed.");
  }
  return url.toString();
}
