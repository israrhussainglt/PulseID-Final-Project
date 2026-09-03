import { NextRequest, NextResponse } from "next/server";
import { verifySession, ANALYST_COOKIE } from "@/lib/auth";
import { listBulletins } from "@/lib/bulletin-db";
import { generateBulletin } from "@/lib/bulletin-generator";
import { AI_CONFIGURED } from "@/lib/ai";
import { logAnalystAction } from "@/lib/audit";
import { requestIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(ANALYST_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  return NextResponse.json({ bulletins: listBulletins() });
}

// Manual "Generate now" trigger — the same code path the scheduled job
// uses (scripts/scheduler.ts), just invoked on demand instead of on a
// cron. Either way the result lands in the review queue as
// pending_review, never auto-published.
export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get(ANALYST_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!AI_CONFIGURED) {
    return NextResponse.json({ error: "AI bulletin generation is not configured (set OPENROUTER_API_KEY or ANTHROPIC_API_KEY)." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const period = body?.period === "monthly" ? "monthly" : "weekly";

  try {
    const bulletin = await generateBulletin(period, "manual");
    logAnalystAction({
      analystEmail: session.email,
      analystName: session.name,
      action: "bulletin_generated",
      detail: bulletin.periodLabel,
      ip: requestIp(req),
    });
    return NextResponse.json({ bulletin });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate bulletin." }, { status: 502 });
  }
}
