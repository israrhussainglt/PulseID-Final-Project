import { SignJWT, jwtVerify } from "jose";
import type { AnalystRole } from "@/lib/analysts";

// Deliberately its own secret/cookie/session type — an analyst session must
// never be interchangeable with a doctor or patient session, even by
// accident, since this app and the main backend are separate trust domains
// that only talk to each other over the service key in lib/api.ts.
const secretString = process.env.ANALYTICS_SESSION_SECRET || "pulseid-analytics-dev-secret-change-me";
const secret = new TextEncoder().encode(secretString);

export const ANALYST_COOKIE = "pulseid_analyst_session";

// Carries the signed-in analyst's identity, not just "an analyst is
// signed in" — this is what lets every audit-log entry and every bulletin
// approval say *who*, and what lets admin-only routes (analyst management,
// the audit log) tell an admin apart from a viewer server-side.
export type AnalystSession = {
  role: AnalystRole;
  analystId: string;
  name: string;
  email: string;
  issuedAt: number;
};

export async function signSession(payload: Omit<AnalystSession, "issuedAt">): Promise<string> {
  return new SignJWT({ ...payload, issuedAt: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
}

export async function verifySession(token: string | undefined | null): Promise<AnalystSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AnalystSession;
  } catch {
    return null;
  }
}

const isProd = process.env.NODE_ENV === "production";
// Callers pass maxAgeMs in milliseconds (matches the main backend's
// Express-based sessionCookieOptions, where res.cookie()'s maxAge is also
// milliseconds). But this app sets cookies via Next.js's
// NextResponse.cookies.set(), whose `maxAge` option is in SECONDS — so the
// value has to be converted here, or an "8 hour" session silently becomes
// an 8-million-second (~93 day) one.
export function sessionCookieOptions(maxAgeMs: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: Math.round(maxAgeMs / 1000),
  };
}
