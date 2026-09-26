import { NextRequest, NextResponse } from "next/server";
import { getSession, SESSION_COOKIE } from "@/lib/session";
import { githubAuthorizeUrl, GITHUB_OAUTH_COOKIE, isGithubConfigured } from "@/lib/github/config";
import { newOauthState, safeNextPath } from "@/lib/services/github.service";
import { rateLimit } from "@/lib/rate-limit";
import { getAppUrl } from "@/lib/env";

export async function GET(request: NextRequest) {
  const intent = request.nextUrl.searchParams.get("intent") === "connect" ? "connect" : "login";
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), intent === "connect" ? "/sites" : "/sites");
  if (!isGithubConfigured()) {
    const dest = intent === "connect" ? "/sites?error=github_config" : "/login?error=github_config";
    return NextResponse.redirect(new URL(dest, getAppUrl()));
  }
  if (!rateLimit(`github-oauth:${request.headers.get("x-forwarded-for") ?? "local"}`, 12).ok) {
    return NextResponse.redirect(new URL("/login?error=github_rate", getAppUrl()));
  }
  if (intent === "connect") {
    const session = await getSession(SESSION_COOKIE);
    if (!session || session.role !== "CUSTOMER") {
      return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent("/sites")}`, getAppUrl()));
    }
  }
  const state = newOauthState();
  const redirect = NextResponse.redirect(githubAuthorizeUrl(state));
  redirect.cookies.set(GITHUB_OAUTH_COOKIE, JSON.stringify({ state, next, intent }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });
  return redirect;
}
