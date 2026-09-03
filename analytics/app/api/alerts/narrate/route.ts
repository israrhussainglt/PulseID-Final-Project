import { NextRequest, NextResponse } from "next/server";
import { verifySession, ANALYST_COOKIE } from "@/lib/auth";
import { getAlerts } from "@/lib/api";
import { askClaude, ANALYST_SYSTEM_PROMPT, AI_CONFIGURED } from "@/lib/ai";

// Drafts a short, plain-language explanation of the current outbreak
// alerts. The alerts themselves (region, diagnosis, ratio) are computed
// purely statistically in the backend — this route only asks the model to
// explain what's already been detected, in words a non-technical reader
// can act on. If no ANTHROPIC_API_KEY is configured, it degrades to "AI
// unavailable" rather than failing the whole alerts page.
export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get(ANALYST_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  if (!AI_CONFIGURED) {
    return NextResponse.json({ error: "AI narration is not configured (ANTHROPIC_API_KEY unset)." }, { status: 503 });
  }

  try {
    const alerts = await getAlerts();
    if (alerts.length === 0) {
      return NextResponse.json({ summary: "No active alerts — nothing to narrate right now." });
    }

    const dataBlock = alerts
      .map(
        (a) =>
          `${a.region} — ${a.diagnosis}: latest week ${a.latestCount} cases vs a baseline average of ${a.baselineAverage}/week (${a.ratio}x baseline, severity: ${a.severity})`
      )
      .join("\n");

    const summary = await askClaude(
      ANALYST_SYSTEM_PROMPT,
      `Here are the current statistically-flagged outbreak alerts, most severe first:\n\n${dataBlock}\n\nWrite a short briefing (3-6 sentences) a health-ministry official could read in 20 seconds: what's happening, where, and roughly how urgent it looks. Do not repeat every row verbatim — synthesize. Do not recommend specific interventions or resource moves.`
    );
    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate narration." }, { status: 502 });
  }
}
