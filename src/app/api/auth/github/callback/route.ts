import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import { GITHUB_OAUTH_COOKIE, isGithubConfigured } from "@/lib/github/config";
import { GithubError } from "@/lib/github/api";
import { completeGithubOAuth, safeNextPath } from "@/lib/services/github.service";
import { getAppUrl } from "@/lib/env";
import { CUSTOMER_TOTP_PENDING_COOKIE } from "@/lib/security/customer-totp-pending";

function fail(path: string) {
  return NextResponse.redirect(new URL(path, getAppUrl()));
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");
  const raw = request.cookies.get(GITHUB_OAUTH_COOKIE)?.value;
  const clear = fail("/login?error=github");
  clear.cookies.delete(GITHUB_OAUTH_COOKIE);

  if (!isGithubConfigured()) return fail("/login?error=github_config");
  if (denied) {
    const dest = fail("/login?error=github_denied");
    dest.cookies.delete(GITHUB_OAUTH_COOKIE);
    return dest;
  }
  if (!code || !state || !raw) return clear;

  let payload: { state?: string; next?: string; intent?: string };
  try {
    payload = JSON.parse(raw) as { state?: string; next?: string; intent?: string };
  } catch {
    return clear;
  }
  if (payload.state !== state) return clear;

  const intent = payload.intent === "connect" ? "connect" : "login";
  const next = safeNextPath(payload.next, "/sites");

  try {
    const session = await getSession(SESSION_COOKIE);
    const result = await completeGithubOAuth({
      code,
      intent,
      userId: session?.sub,
    });
    const dest = NextResponse.redirect(
      new URL(intent === "login" ? result.redirectTo || next : next, getAppUrl()),
    );
    dest.cookies.delete(GITHUB_OAUTH_COOKIE);
    if ("needsTotp" in result && result.needsTotp && result.pendingToken) {
      dest.cookies.set(CUSTOMER_TOTP_PENDING_COOKIE, result.pendingToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 5,
      });
    }
    return dest;
  } catch (error) {
    const message = error instanceof GithubError ? error.message : "GitHub sign-in failed.";
    const query =
      message.includes("verified email")
        ? "github_email"
        : message.includes("already connected")
          ? "github_exists"
          : message.includes("Admin")
            ? "github_admin"
            : "github";
    const dest = fail(intent === "connect" ? `/sites?error=${query}` : `/login?error=${query}`);
    dest.cookies.delete(GITHUB_OAUTH_COOKIE);
    return dest;
  }
}
