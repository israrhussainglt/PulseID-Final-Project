import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { listAuditLog } from "@/lib/audit";

// Admin-only. Read-only view over the analyst_audit_log table — same
// access-transparency idea as the patient-facing audit log the main
// backend gives every patient over their own record, just for this app's
// own sensitive actions instead.
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  return NextResponse.json({ entries: listAuditLog(200) });
}
