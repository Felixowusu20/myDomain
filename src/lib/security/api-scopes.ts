export const API_KEY_SCOPES = ["sms:send", "sms:read", "otp:send", "otp:verify"] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export function isApiKeyScope(value: string): value is ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(value);
}
