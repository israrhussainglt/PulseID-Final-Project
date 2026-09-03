import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { getAnalystById, setAnalystActive } from "@/lib/analysts";
import { logAnalystAction } from "@/lib/audit";
import { requestIp } from "@/lib/rate-limit";

// Deactivation, not deletion — keeps the analyst's name/email attached to
// their past bulletin reviews and audit-log entries (see reviewed_by in
// lib/bulletin-db.ts) instead of orphaning that history. A deactivated
// account simply can no longer log in (verifyAnalystLogin checks `active`).
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const target = getAnalystById(params.id);
  if (!target) return NextResponse.json({ error: "Analyst not found." }, { status: 404 });
  if (target.id === session.analystId) {
    return NextResponse.json({ error: "You can't deactivate your own account." }, { status: 400 });
  }

  setAnalystActive(target.id, false);
  logAnalystAction({
    analystEmail: session.email,
    analystName: session.name,
    action: "analyst_deactivated",
    detail: target.email,
    ip: requestIp(_req),
  });
  return NextResponse.json({ ok: true });
}
