import { createHmac, timingSafeEqual } from "crypto";
import { getAppUrl } from "@/lib/env";
import { getNamecomConfig } from "@/lib/providers/namecom/config";

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const key of Object.keys(record).sort()) {
      next[key] = sortKeys(record[key]);
    }
    return next;
  }
  return value;
}

export function namecomWebhookUrl() {
  return (
    process.env.NAMECOM_WEBHOOK_URL?.trim() ||
    `${getAppUrl()}/api/webhooks/namecom`
  );
}

/**
 * Verify X-NAMECOM-SIGNATURE per name.com HMAC docs.
 * Signing key is the account API token (earliest token on multi-token accounts).
 * Fail closed when name.com is configured.
 */
export function verifyNamecomWebhookSignature(input: {
  payload: Record<string, unknown>;
  headerValue: string | null;
  rawBody?: string;
}) {
  const config = getNamecomConfig();
  if (!config) {
    throw new Error("name.com is not configured; refusing webhooks.");
  }

  const header = input.headerValue?.trim() ?? "";
  if (!header) {
    throw new Error("Missing X-NAMECOM-SIGNATURE.");
  }

  const parts = header.split(",");
  if (parts.length !== 3) {
    throw new Error("Invalid webhook signature format.");
  }
  const [signaturePart, timestampStr] = parts;
  const timestamp = Number.parseInt(timestampStr, 10);
  if (!Number.isFinite(timestamp)) {
    throw new Error("Invalid webhook signature timestamp.");
  }
  const maxAge = Number(process.env.NAMECOM_WEBHOOK_MAX_AGE_SECONDS ?? 300);
  if (Math.abs(Math.floor(Date.now() / 1000) - timestamp) > maxAge) {
    throw new Error("Webhook signature timestamp is too old.");
  }
  if (!signaturePart.includes("=")) {
    throw new Error("Invalid webhook signature value.");
  }
  const [algorithm, signatureValue] = signaturePart.split("=", 2);
  if (algorithm !== "sha256" || !signatureValue) {
    throw new Error("Unsupported webhook signature algorithm.");
  }

  const sorted = sortKeys(input.payload);
  const jsonPayload = JSON.stringify(sorted);
  const signatureData = `${namecomWebhookUrl()}|${jsonPayload}`;
  const expectedHex = createHmac(algorithm, config.token)
    .update(signatureData, "utf8")
    .digest("hex");

  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(signatureValue, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new Error("Invalid webhook signature.");
  }
  return true;
}
