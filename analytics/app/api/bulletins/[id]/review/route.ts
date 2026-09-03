import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { reviewBulletin, getBulletin } from "@/lib/bulletin-db";
import { logAnalystAction } from "@/lib/audit";
import { requestIp } from "@/lib/rate-limit";

// The review step the feature is built around: a scheduled/generated
// bulletin sits as pending_review until an analyst explicitly approves or
// rejects it here. Nothing in this app sends a bulletin anywhere on its
// own — "approved" just means "an analyst signed off," ready for someone
// to actually distribute (download/print/paste into an email) from the
// Bulletins page.
//
// Admin-only: approving a public-health bulletin is a sign-off action, the
// same tier as the main backend's requireDoctor-gated edits — a read-only
// viewer account can see bulletins but can't approve them.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const existing = getBulletin(params.id);
  if (!existing) return NextResponse.json({ error: "Bulletin not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const action = body?.action === "reject" ? "rejected" : body?.action === "approve" ? "approved" : null;
  if (!action) return NextResponse.json({ error: "action must be 'approve' or 'reject'." }, { status: 400 });

  const note = typeof body?.note === "string" ? body.note.slice(0, 500) : undefined;
  const updated = reviewBulletin(params.id, action, note, session.email);

  logAnalystAction({
    analystEmail: session.email,
    analystName: session.name,
    action: action === "approved" ? "bulletin_approved" : "bulletin_rejected",
    detail: `${existing.periodLabel} (${existing.period})${note ? ` — ${note}` : ""}`,
    ip: requestIp(req),
  });

  return NextResponse.json({ bulletin: updated });
}
