import { NextRequest, NextResponse } from "next/server";
import { ANALYST_COOKIE, verifySession } from "@/lib/auth";
import { logAnalystAction } from "@/lib/audit";
import { requestIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get(ANALYST_COOKIE)?.value);
  if (session) {
    logAnalystAction({ analystEmail: session.email, analystName: session.name, action: "logout", ip: requestIp(req) });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ANALYST_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
