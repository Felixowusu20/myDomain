import { config } from "dotenv";

config({ path: ".env" });
config({ path: ".env.local", override: true });

export function getAppUrl() {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    "http://localhost:3000";
  return raw.trim().replace(/\/+$/, "");
}

export function getDatabaseUrl() {
  const raw =
    process.env.DATABASE_URL?.trim() ||
    process.env.Database_URL?.trim() ||
    "";
  if (!raw) return "";
  return normalizePostgresSslMode(raw);
}

/**
 * pg v9 will change sslmode=require semantics. Keep today's verify-full behavior
 * and silence the Node security warning without weakening TLS.
 */
function normalizePostgresSslMode(connectionString: string) {
  try {
    const url = new URL(connectionString);
    const mode = url.searchParams.get("sslmode")?.toLowerCase();
    if (mode === "require" || mode === "prefer" || mode === "verify-ca") {
      url.searchParams.set("sslmode", "verify-full");
    } else if (!mode) {
      url.searchParams.set("sslmode", "verify-full");
    }
    url.searchParams.delete("uselibpqcompat");
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function smtpAuthUser() {
  const user = process.env.SMTP_USER?.trim() ?? "";
  if (user.includes("@")) return user;
  const from = process.env.SMTP_FROM ?? "";
  const match = from.match(/<([^>]+)>/);
  return (match?.[1] ?? from).trim();
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_PASS?.trim() &&
      smtpAuthUser(),
  );
}

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME?.trim() &&
      process.env.CLOUDINARY_API_KEY?.trim() &&
      process.env.CLOUDINARY_API_SECRET?.trim(),
  );
}
