import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { verifyPasswordForAnalyst, changeAnalystPassword } from "@/lib/analysts";
import { logAnalystAction } from "@/lib/audit";
import { rateLimit, requestIp } from "@/lib/rate-limit";

// Self-service password change — every analyst needs this, not just the
// bootstrapped admin, and it's the only way to rotate the initial admin
// password set via ANALYTICS_ADMIN_PASSWORD without touching the database
// directly. Requires the current password, same as changing a doctor's
// password would if that flow existed — never just "logged in, so trusted."
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const limited = rateLimit(`password-change:${session.analystId}`, 5, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < 10) {
    return NextResponse.json({ error: "New password must be at least 10 characters." }, { status: 400 });
  }
  if (!verifyPasswordForAnalyst(session.analystId, currentPassword)) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  changeAnalystPassword(session.analystId, newPassword);
  logAnalystAction({
    analystEmail: session.email,
    analystName: session.name,
    action: "password_changed",
    ip: requestIp(req),
  });
  return NextResponse.json({ ok: true });
}
