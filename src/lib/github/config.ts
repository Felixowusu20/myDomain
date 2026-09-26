import { getAppUrl } from "@/lib/env";

export const GITHUB_OAUTH_SCOPES = "read:user user:email repo";
export const GITHUB_OAUTH_COOKIE = "mydomain_github_oauth";

export function githubClientId() {
  return process.env.GITHUB_CLIENT_ID?.trim() ?? "";
}

export function githubClientSecret() {
  return process.env.GITHUB_CLIENT_SECRET?.trim() ?? "";
}

export function isGithubConfigured() {
  return Boolean(githubClientId() && githubClientSecret());
}

export function githubCallbackUrl() {
  return `${getAppUrl()}/api/auth/github/callback`;
}

export function githubAuthorizeUrl(state: string) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", githubClientId());
  url.searchParams.set("redirect_uri", githubCallbackUrl());
  url.searchParams.set("scope", GITHUB_OAUTH_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");
  return url.toString();
}
