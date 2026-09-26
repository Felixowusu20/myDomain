import { randomUUID } from "crypto";
import { getNamecomConfig } from "@/lib/providers/namecom/config";

export class NamecomError extends Error {
  status: number;
  details?: string;

  constructor(message: string, status = 500, details?: string) {
    super(message);
    this.name = "NamecomError";
    this.status = status;
    this.details = details;
  }
}

export async function namecomRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: { idempotencyKey?: string },
): Promise<T> {
  const config = getNamecomConfig();
  if (!config) {
    throw new NamecomError("name.com API credentials are missing.", 503);
  }

  const url = `${config.baseUrl}${config.prefix}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {
    Authorization: `Basic ${Buffer.from(`${config.username}:${config.token}`).toString("base64")}`,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (init?.idempotencyKey) headers["X-Idempotency-Key"] = init.idempotencyKey;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      data = { message: text };
    }
  }
  if (!response.ok) {
    const message =
      (typeof data.message === "string" && data.message) ||
      `name.com request failed (${response.status})`;
    const details = typeof data.details === "string" ? data.details : undefined;
    throw new NamecomError(message, response.status, details);
  }
  return data as T;
}

export function namecomIdempotencyKey(seed?: string) {
  return seed?.trim() || randomUUID();
}
