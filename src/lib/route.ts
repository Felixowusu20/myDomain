import { NextRequest } from "next/server";
import { AuthError } from "@/lib/guard";
import { jsonError } from "@/lib/api";
import { ZodError } from "zod";
import { NamecomError } from "@/lib/providers/namecom/client";
import { GithubError } from "@/lib/github/api";
import { MessagingError } from "@/lib/messaging/errors";

export function handleRouteError(error: unknown) {
  if (error instanceof AuthError) {
    return jsonError(error.message, error.status);
  }
  if (error instanceof ZodError) {
    return jsonError(error.issues[0]?.message ?? "Invalid input", 400);
  }
  if (error instanceof NamecomError) {
    return jsonError(error.message, error.status >= 500 ? 502 : error.status);
  }
  if (error instanceof GithubError) {
    return jsonError(error.message, error.status >= 500 ? 502 : error.status);
  }
  if (error instanceof MessagingError) {
    return jsonError(error.message, error.status);
  }
  if (error instanceof Error) {
    if (error.message.includes("paused until a live payment provider")) {
      return jsonError(error.message, 402);
    }
    if (
      error.message.startsWith("AUTH_SECRET") ||
      error.message.includes("AUTH_SECRET must be set")
    ) {
      console.error(error);
      return jsonError("Server authentication is misconfigured.", 500);
    }
    const friendly = [
      "Your cart is empty.",
      "We couldn't complete your payment. Please try again.",
      "That domain is no longer available. Try one of these alternatives.",
      "Enter a name like myshop",
      "Enter a full domain, like mybusiness.com",
      "Plan not found",
      "name.com is not configured.",
      "No auth code is available for this domain yet.",
      "That domain is available to register. Add it from search instead.",
      "That domain is already on this platform.",
      "Enter the transfer authorization code from the current registrar.",
      "Enter a GitHub repo like owner/repo",
      "Connect a GitHub repo first.",
      "This preview has ended. Buy a hosting plan to deploy again.",
      "This preview has ended. Buy a hosting plan to connect a domain.",
      "No servers available. Add one in admin before selling paid hosting.",
      "Connect GitHub to import a repository.",
      "GitHub did not share a verified email.",
      "This GitHub account is already connected to another user.",
      "This account uses GitHub. Continue with GitHub to sign in.",
      "GitHub sign-in is not configured.",
      "Please sign in to connect GitHub.",
      "Admin accounts sign in from the admin page.",
      "Reconnect GitHub to continue.",
      "That repository is not accessible with this GitHub account.",
      "Repository is archived or disabled.",
      "Enter a valid http(s) link or a path starting with /.",
      "Only http(s) links are allowed.",
      "Invalid link.",
      "Admin profile not found.",
      "Customer profile not found.",
      "Two-factor authentication is already enabled.",
      "Invalid setup session. Start again.",
      "That authenticator code is invalid or expired.",
      "Two-factor authentication is not enabled.",
      "Two-factor authentication is not enabled for this account.",
      "This account does not have admin access.",
      "This account does not have customer access.",
      "This account has been suspended.",
      "Type the full domain name to confirm deletion.",
      "Type the customer email to confirm deletion.",
      "Only customer accounts can be deleted from this panel.",
    ];
    if (
      friendly.includes(error.message) ||
      error.message === "REGISTRATION_PENDING" ||
      error.message === "TRANSFER_PENDING" ||
      error.message.startsWith("Deploy checks failed.") ||
      error.message.startsWith("Link must be")
    ) {
      return jsonError(
        error.message === "REGISTRATION_PENDING"
          ? "We received your order, but we're still completing your domain registration. We'll notify you when it's ready."
          : error.message === "TRANSFER_PENDING"
            ? "We received your order and started the transfer. We'll notify you when the domain arrives."
            : error.message,
        400,
      );
    }
    console.error(error);
    return jsonError("We're temporarily unable to complete this request. Please try again shortly.", 500);
  }
  return jsonError("We're temporarily unable to complete this request. Please try again shortly.", 500);
}

export async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
