/**
 * Shared auth secret for JWT + encryption.
 * No hardcoded fallback — fail closed if missing/weak.
 */
export function requireAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  if (secret.length < 32) {
    throw new Error(
      "AUTH_SECRET must be set to a random string of at least 32 characters (see .env.example).",
    );
  }
  return secret;
}

export function authSecretBytes() {
  return new TextEncoder().encode(requireAuthSecret());
}
