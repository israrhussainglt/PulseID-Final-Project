import { cookies } from "next/headers";
import { verifySession, ANALYST_COOKIE, type AnalystSession } from "@/lib/auth";

// Small server-side helper for reading the current analyst session from a
// route handler or server component via next/headers, instead of every
// caller re-importing verifySession + the cookie name. Middleware already
// guarantees a valid session reaches every route under this layout (see
// middleware.ts), so getSession() here is for *reading who it is*, not for
// re-deciding whether the request is authenticated.
export async function getSession(): Promise<AnalystSession | null> {
  const token = cookies().get(ANALYST_COOKIE)?.value;
  return verifySession(token);
}

// Route handlers that perform an admin-only action (approving a bulletin,
// managing analyst accounts, reading the audit log) call this first and
// bail out with a 403 if it returns null — enforced here in the route
// itself, not just hidden behind a nav link, the same posture the main
// backend's requireDoctor middleware takes for doctor-only routes.
export async function requireAdmin(): Promise<AnalystSession | null> {
  const session = await getSession();
  if (!session || session.role !== "admin") return null;
  return session;
}
