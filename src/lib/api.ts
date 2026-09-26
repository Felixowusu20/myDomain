import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized(message = "Please sign in to continue.") {
  return jsonError(message, 401);
}

export function forbidden(message = "You do not have access to this.") {
  return jsonError(message, 403);
}

export const customerErrors = {
  domainUnavailable:
    "That domain is no longer available. Try one of these alternatives.",
  paymentFailed: "We couldn't complete your payment. Please try again.",
  registrationPending:
    "We received your order, but we're still completing your domain registration. We'll notify you when it's ready.",
  providerUnavailable:
    "We're temporarily unable to complete this request. Please try again shortly.",
  notFound: "We couldn't find that item.",
};
