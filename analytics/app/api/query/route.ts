import { NextRequest, NextResponse } from "next/server";
import { verifySession, ANALYST_COOKIE } from "@/lib/auth";
import {
  getOverview,
  getRegions,
  getProvinces,
  getHospitals,
  getTopConditions,
  getAlerts,
  getMatrix,
  getDataQuality,
  getNationalTrend,
} from "@/lib/api";
import { askClaude, ANALYST_SYSTEM_PROMPT, AI_CONFIGURED } from "@/lib/ai";
import { logAnalystAction } from "@/lib/audit";
import { rateLimit, requestIp } from "@/lib/rate-limit";

// Natural-language query over the aggregate data. This deliberately does
// NOT let the model write or run SQL, and it never touches the backend's
// patient-record tables — it always calls the same aggregate-only
// lib/api.ts functions every other page uses, bundles the results into one
// context block, and asks the model to answer *from that block only*. That
// keeps "what can I ask" bounded by "what this dashboard already knows,"
// which is the whole safety property of this feature.
export async function POST(req: NextRequest) {
  const session = await verifySession(req.cookies.get(ANALYST_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (!AI_CONFIGURED) {
    return NextResponse.json({ error: "AI query is not configured (ANTHROPIC_API_KEY unset)." }, { status: 503 });
  }

  // Each AI call costs real money against the configured provider — rate
  // limited per analyst (not just per IP) so one account can't rack up
  // unbounded usage, accidentally or otherwise.
  const limited = rateLimit(`ai-query:${session.email}`, 20, 10 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many questions in a short time. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  if (!question) return NextResponse.json({ error: "question is required." }, { status: 400 });
  if (question.length > 500) return NextResponse.json({ error: "Question is too long." }, { status: 400 });

  try {
    // Pulled in parallel so one slow aggregate query doesn't stall the
    // others — this is still all read-only, aggregate-only data, just a
    // wider slice of it than before so the assistant can actually answer
    // cross-cutting questions (province/hospital drill-down, the
    // region x condition matrix, data-quality caveats, the national trend
    // line) instead of just the handful of top-level numbers.
    const [overview, regions, provinces, hospitals, conditions, alerts, matrix, quality, nationalTrend] = await Promise.all([
      getOverview(),
      getRegions(),
      getProvinces(),
      getHospitals(),
      getTopConditions(20),
      getAlerts(),
      getMatrix(8),
      getDataQuality(),
      getNationalTrend("week", 12),
    ]);

    const context = JSON.stringify(
      {
        overview,
        regions,
        provinces,
        hospitals,
        topConditionsNationwide: conditions,
        activeAlerts: alerts,
        regionConditionMatrix: matrix,
        dataQuality: quality,
        nationalWeeklyTrend: nationalTrend,
      },
      null,
      0
    );

    const answer = await askClaude(
      ANALYST_SYSTEM_PROMPT +
        `\n\nYou will be given a JSON snapshot of the current aggregate dashboard data, then a question. Answer ONLY using that JSON — if the data needed to answer isn't in it, say so plainly instead of guessing. Counts of null with suppressed:true mean the true value is under 5 and withheld; refer to it as "fewer than 5," never as zero.

Guidance for a good answer:
- Lead with the direct answer in one or two sentences, then supporting detail.
- When the question spans multiple regions, hospitals, or conditions, use a short bulleted or numbered list rather than a wall of prose.
- If the dataQuality section shows a relevant region/hospital has notable missingness or lag, mention it briefly as a caveat rather than silently ignoring it.
- If the question can't be answered from the provided JSON (e.g. it asks about an individual patient, a time range outside nationalWeeklyTrend, or something not tracked here), say exactly what's missing instead of extrapolating.`,
      `DASHBOARD DATA:\n${context}\n\nQUESTION: ${question}`,
      1100
    );
    logAnalystAction({
      analystEmail: session.email,
      analystName: session.name,
      action: "ai_query",
      detail: question.slice(0, 200),
      ip: requestIp(req),
    });
    return NextResponse.json({ answer });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to answer." }, { status: 502 });
  }
}
