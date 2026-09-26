import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/guard";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { apiSecretMatches, parseApiToken, parseScopes, type ApiKeyScope } from "@/lib/security/api-key";

export type ApiAuth = {
  keyId: string;
  prefix: string;
  projectId: string;
  customerId: string;
  scopes: ApiKeyScope[];
};

const DUMMY_HASH = "0".repeat(64);

export async function requireApiKey(request: Request, scope: ApiKeyScope | ApiKeyScope[]): Promise<ApiAuth> {
  const required = Array.isArray(scope) ? scope : [scope];
  const ip = clientIp(request);
  if (!rateLimit(`api-key:${ip}`, 60, 60_000).ok) {
    throw new AuthError("Too many attempts. Please wait a moment.", 429);
  }

  const header = request.headers.get("authorization") ?? "";
  const token = header.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() ?? "";
  const parsed = parseApiToken(token);
  if (!parsed) {
    apiSecretMatches("invalid-api-key-material", DUMMY_HASH);
    throw new AuthError("Invalid API key.");
  }

  const key = await prisma.apiKey.findUnique({
    where: { prefix: parsed.prefix },
    include: { project: { include: { customer: { include: { user: true } } } } },
  });

  const matches = apiSecretMatches(parsed.secret, key?.secretHash ?? DUMMY_HASH);
  if (!key || !matches || key.status !== "ACTIVE" || (key.expiresAt && key.expiresAt <= new Date())) {
    throw new AuthError("Invalid API key.");
  }
  if (key.project.status !== "ACTIVE" || key.project.customer.user.status !== "ACTIVE") {
    throw new AuthError("This API key is not available.", 403);
  }

  const scopes = parseScopes(key.scopesJson);
  if (!required.some((item) => scopes.includes(item))) {
    throw new AuthError("This API key does not have access to this action.", 403);
  }

  void prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  return {
    keyId: key.id,
    prefix: key.prefix,
    projectId: key.projectId,
    customerId: key.project.customerId,
    scopes,
  };
}
