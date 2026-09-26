import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/guard";
import { MessagingError } from "@/lib/messaging/errors";

export function messagingOk(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function messagingError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export function handleMessagingError(error: unknown) {
  if (error instanceof MessagingError) return messagingError(error.message, error.status);
  if (error instanceof AuthError) return messagingError(error.message, error.status);
  if (error instanceof ZodError) {
    return messagingError(error.issues[0]?.message ?? "Invalid input", 400);
  }
  console.error(error);
  return messagingError("We're temporarily unable to complete this request. Please try again shortly.", 500);
}

export function idempotencyKey(request: Request) {
  const raw = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!raw) return null;
  if (raw.length < 8 || raw.length > 200) {
    throw new MessagingError("Idempotency-Key must be between 8 and 200 characters.");
  }
  return raw;
}
