import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { parsePreviewSlugFromHost } from "@/lib/runtime/preview-host";

const customerPrefixes = [
  "/dashboard",
  "/domains",
  "/hosting",
  "/sites",
  "/dns",
  "/billing",
  "/orders",
  "/support",
  "/account",
  "/cart",
  "/checkout",
  "/sms",
];

async function tokenRole(token: string | undefined): Promise<"CUSTOMER" | "ADMIN" | null> {
  if (!token) return null;
  const secret = process.env.AUTH_SECRET?.trim() ?? "";
  if (secret.length < 32) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (payload.role === "ADMIN" || payload.role === "CUSTOMER") return payload.role;
    return null;
  } catch {
    return null;
  }
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-XSS-Protection", "0");
  return response;
}

export async function middleware(request: NextRequest) {
  const previewSlug = parsePreviewSlugFromHost(request.headers.get("host"));
  if (previewSlug) {
    const url = request.nextUrl.clone();
    const suffix = url.pathname === "/" ? "" : url.pathname;
    url.pathname = `/api/runtime-proxy/${previewSlug}${suffix}`;
    return withSecurityHeaders(NextResponse.rewrite(url));
  }

  const { pathname } = request.nextUrl;
  const customerToken = request.cookies.get("mydomain_session")?.value;
  const adminToken = request.cookies.get("mydomain_admin_session")?.value;
  const [customerRole, adminRole] = await Promise.all([
    tokenRole(customerToken),
    tokenRole(adminToken),
  ]);

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (adminRole !== "ADMIN") {
      const url = new URL("/admin/login", request.url);
      url.searchParams.set("next", pathname);
      const response = NextResponse.redirect(url);
      if (adminToken) response.cookies.delete("mydomain_admin_session");
      return withSecurityHeaders(response);
    }
  }

  if (customerPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    if (customerRole !== "CUSTOMER") {
      const url = new URL("/login", request.url);
      url.searchParams.set("next", pathname);
      const response = NextResponse.redirect(url);
      if (customerToken) response.cookies.delete("mydomain_session");
      return withSecurityHeaders(response);
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    /*
     * Preview subdomains need every path (including /_next) rewritten to the
     * runtime proxy. Platform auth only applies on the primary app host.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
    "/_next/static/:path*",
    "/_next/image/:path*",
  ],
};
