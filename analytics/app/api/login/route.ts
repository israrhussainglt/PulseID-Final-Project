import { NextRequest, NextResponse } from "next/server";
import { signSession, sessionCookieOptions, ANALYST_COOKIE } from "@/lib/auth";
import { verifyAnalystLogin } from "@/lib/analysts";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { logAnalystAction } from "@/lib/audit";

// Named analyst accounts (see lib/analysts.ts) instead of one shared
// password — this is what lets every audit-log entry say *who* signed in,
// approved a bulletin, or ran a query, which a single shared password could
// never do. Rate-limited per ip+email pair so a guessed or leaked password
// can't be brute-forced against one account, without one bucket accidentally
// covering every analyst (see the rateLimit call below), and every attempt
// (success or failure) is written to the audit log the same way the main
// backend logs doctor logins.
export async function POST(req: NextRequest) {
  const ip = requestIp(req);

  const body = await req.json().catch(() => ({}));
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  // Keyed on ip+email, not ip alone: this app is often deployed (see
  // docker-compose.yml) with no reverse proxy in front of it, so every
  // request can arrive with the same "unknown" ip (see requestIp). Rate
  // limiting by ip alone would then put every analyst in the organization
  // into one shared bucket — a few mistyped passwords from one person would
  // lock everyone else out too. Keying on the attempted email as well still
  // stops brute-forcing any single account, without that collateral lockout.
  const limited = rateLimit(`analytics-login:${ip}:${email.toLowerCase()}`, 8, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const analyst = verifyAnalystLogin(email, password);
  if (!analyst) {
    logAnalystAction({ analystEmail: email, action: "login_failed", ip });
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const token = await signSession({
    role: analyst.role,
    analystId: analyst.id,
    name: analyst.name,
    email: analyst.email,
  });
  logAnalystAction({ analystEmail: analyst.email, analystName: analyst.name, action: "login", ip });

  const res = NextResponse.json({ ok: true, analyst: { name: analyst.name, email: analyst.email, role: analyst.role } });
  res.cookies.set(ANALYST_COOKIE, token, sessionCookieOptions(8 * 60 * 60 * 1000));
  return res;
}
