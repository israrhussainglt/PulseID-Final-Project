import { NextRequest, NextResponse } from "next/server";
import { verifySession, ANALYST_COOKIE } from "./lib/auth";

const PUBLIC_PATHS = ["/login", "/api/login"];

// Pages only an admin analyst should see in the UI. The real enforcement
// still happens server-side in each route handler (see lib/session.ts
// requireAdmin) — this redirect is a defense-in-depth UX nicety so a
// viewer never even lands on a page whose actions would be rejected.
const ADMIN_PATHS = ["/dashboard/audit", "/dashboard/analysts"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(ANALYST_COOKIE)?.value;
  const session = await verifySession(token);
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) && session.role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Protects everything except the login page and its API route, the
// framework's own static/internal paths, and the app's public icon/PWA
// assets — those have to be reachable by a browser (or an install prompt)
// before the visitor ever has a session cookie, so they can't sit behind
// the same redirect-to-/login gate as real pages.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icon-192.png|icon-512.png|site.webmanifest|sw.js|offline.html).*)",
  ],
};
