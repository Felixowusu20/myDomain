import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { requireAuthSecret } from "@/lib/security/auth-secret";
import { isApiKeyScope, type ApiKeyScope } from "@/lib/security/api-scopes";

export { API_KEY_SCOPES, isApiKeyScope, type ApiKeyScope } from "@/lib/security/api-scopes";

const TOKEN = /^md_live_([a-f0-9]{8})_(.+)$/;

export function normalizeScopes(values: string[]) {
  const scopes = [...new Set(values.filter(isApiKeyScope))];
  return scopes;
}

export function parseApiToken(token: string) {
  const match = token.trim().match(TOKEN);
  if (!match || match[2].length < 20) return null;
  return { prefix: `md_live_${match[1]}`, secret: match[2] };
}

export function createApiKeyMaterial() {
  const prefix = `md_live_${randomBytes(4).toString("hex")}`;
  const secret = randomBytes(24).toString("base64url");
  const token = `${prefix}_${secret}`;
  return { prefix, secret, token, secretHash: hashApiSecret(secret) };
}

export function hashApiSecret(secret: string) {
  return createHmac("sha256", requireAuthSecret()).update(secret).digest("hex");
}

export function apiSecretMatches(secret: string, secretHash: string) {
  const expected = Buffer.from(hashApiSecret(secret));
  const actual = Buffer.from(secretHash);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export function parseScopes(scopesJson: string): ApiKeyScope[] {
  try {
    const parsed = JSON.parse(scopesJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is ApiKeyScope => typeof item === "string" && isApiKeyScope(item));
  } catch {
    return [];
  }
}
