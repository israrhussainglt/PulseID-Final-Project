import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { listAnalysts, createAnalyst } from "@/lib/analysts";
import { logAnalystAction } from "@/lib/audit";
import { requestIp } from "@/lib/rate-limit";

// Admin-only account management. A real ministry-of-health rollout needs a
// way to onboard a new analyst and revoke a departing one without editing
// the database by hand — see also app/api/analysts/[id]/route.ts for
// deactivation.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  return NextResponse.json({ analysts: listAnalysts() });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const role = body?.role === "admin" ? "admin" : "viewer";

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
  }
  if (password.length < 10) {
    return NextResponse.json({ error: "Password must be at least 10 characters." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const analyst = createAnalyst({ name, email, password, role });
    logAnalystAction({
      analystEmail: session.email,
      analystName: session.name,
      action: "analyst_created",
      detail: `${analyst.email} (${analyst.role})`,
      ip: requestIp(req),
    });
    return NextResponse.json({ analyst });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Could not create analyst." }, { status: 400 });
  }
}
