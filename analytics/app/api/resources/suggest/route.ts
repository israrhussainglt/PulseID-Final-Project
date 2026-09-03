import { NextRequest, NextResponse } from "next/server";
import { verifySession, ANALYST_COOKIE } from "@/lib/auth";
import { getRegions, getAlerts, getDataQuality } from "@/lib/api";
import { askClaude, ANALYST_SYSTEM_PROMPT, AI_CONFIGURED } from "@/lib/ai";

// Cross-references visit load, active alerts, and reporting-gap flags to
// suggest where staffing/supply attention might be worth a look. Framed
// explicitly as a suggestion for a human to evaluate — this route never
// claims to allocate anything, only to point at signals worth checking.
export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get(ANALYST_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!AI_CONFIGURED) {
    return NextResponse.json({ error: "AI suggestions are not configured (ANTHROPIC_API_KEY unset)." }, { status: 503 });
  }

  try {
    const [regions, alerts, quality] = await Promise.all([getRegions(), getAlerts(), getDataQuality()]);
    const context = JSON.stringify({ regionVisitLoad: regions, activeAlerts: alerts, dataQualityFlags: quality });

    const summary = await askClaude(
      ANALYST_SYSTEM_PROMPT +
        `\n\nYou are drafting a resource-attention list, not making allocation decisions. Every suggestion must be phrased as something a human planner should look into, never as an instruction that's already been carried out.`,
      `Data:\n${context}\n\nBased only on this data, list up to 5 bullet points on where staffing, supplies, or attention might be worth a closer look right now, and why (cite the specific region/number that prompted each one). If nothing stands out, say so plainly.`,
      900
    );
    return NextResponse.json({ summary });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to generate suggestions." }, { status: 502 });
  }
}
