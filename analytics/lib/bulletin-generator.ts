import { randomUUID } from "crypto";
import { getOverview, getRegions, getTopConditions, getAlerts, getDataQuality, getNationalTrend } from "@/lib/api";
import { askClaude, ANALYST_SYSTEM_PROMPT } from "@/lib/ai";
import { insertBulletin, type Bulletin, type BulletinPeriod } from "@/lib/bulletin-db";

// The single place that turns "it's time for the weekly/monthly bulletin"
// into a stored, reviewable document. Used by both the manual
// "Generate now" button (app/api/bulletins/route.ts) and the scheduled job
// (scripts/scheduler.ts) — same function either way, only `generatedBy`
// differs, so a scheduled bulletin and a manual one are indistinguishable
// in quality, only in who asked for it.
//
// Every number quoted in the narrative comes from data gathered here
// first, then handed to the model — the model is asked to explain and
// synthesize precomputed figures (including alert ratios expressed as %
// change), never to compute a percentage itself, which is what keeps the
// bulletin's numbers trustworthy.

function periodLabel(period: BulletinPeriod): string {
  const now = new Date();
  if (period === "monthly") {
    return now.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const start = new Date(now);
  start.setDate(now.getDate() - 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week of ${fmt(start)} – ${fmt(now)}, ${now.getFullYear()}`;
}

export async function generateBulletin(period: BulletinPeriod, generatedBy: "scheduler" | "manual"): Promise<Bulletin> {
  const interval = period === "monthly" ? "month" : "week";
  const [overview, regions, conditions, alerts, quality, nationalTrend] = await Promise.all([
    getOverview(),
    getRegions(),
    getTopConditions(8),
    getAlerts(),
    getDataQuality(),
    getNationalTrend(interval, period === "monthly" ? 6 : 10),
  ]);

  // Precomputed, human-readable % changes for the alerts the model is
  // allowed to cite — e.g. "Dengue Fever in Karachi: +200% vs baseline."
  const alertsWithPct = alerts.map((a) => ({ ...a, pctChangeVsBaseline: Math.round((a.ratio - 1) * 100) }));

  const chartData = {
    nationalTrend: nationalTrend.points.map((p) => ({ bucket: p.bucket, count: p.count.suppressed ? null : p.count.count })),
    topConditions: conditions.map((c) => ({ diagnosis: c.diagnosis, count: c.count.suppressed ? null : c.count.count })),
    regionVisits: regions
      .slice(0, 8)
      .map((r) => ({ region: r.region, province: r.province, visits: r.visitCount.suppressed ? null : r.visitCount.count })),
    alerts: alertsWithPct,
  };

  const dataBlock = JSON.stringify({ overview, chartData, dataQualityFlags: quality });
  const label = periodLabel(period);

  const narrativeMd = await askClaude(
    ANALYST_SYSTEM_PROMPT,
    `Write a ${period} public-health bulletin titled "PulseID National Bulletin — ${label}", in Markdown, using ONLY the JSON snapshot below.

Structure exactly:
# PulseID National Bulletin — ${label}
## Headline
(1-2 sentences — the single most important takeaway, written the way a news headline would state it, e.g. "Dengue cases rose 34% in Karachi this ${period === "monthly" ? "month" : "week"}, concentrated in three hospitals." Only use numbers that are actually in chartData.alerts' pctChangeVsBaseline field — never invent a percentage.)
## National picture
(overall visit volume trend, busiest regions)
## Conditions of note
(top conditions nationwide; call out anything in the alerts list by name and region)
## Data quality note
(mention any reporting gaps from dataQualityFlags, or state reporting looks consistent)
## For the reviewing analyst
(1-2 sentences flagging anything in this data an analyst should double-check before this goes out — e.g. a suppressed count that would have been informative, or a region with too little history to trust yet)

Snapshot:
${dataBlock}`,
    2000
  );

  return insertBulletin({
    id: randomUUID(),
    period,
    periodLabel: label,
    narrativeMd,
    chartData,
    generatedBy,
  });
}
