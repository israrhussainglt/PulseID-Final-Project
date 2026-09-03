import { NextRequest, NextResponse } from "next/server";
import { verifySession, ANALYST_COOKIE } from "@/lib/auth";
import { getRegions, getProvinces, getTopConditions, getDataQuality } from "@/lib/api";
import { toCsv, csvResponseHeaders } from "@/lib/csv";
import { logAnalystAction } from "@/lib/audit";
import { requestIp } from "@/lib/rate-limit";

// Every analyst eventually needs to paste this into a ministry report or a
// spreadsheet — "screenshot the dashboard" isn't a real workflow. This
// exports the same aggregate, small-cell-suppressed numbers already shown
// on-screen, nothing more, as a CSV with formula-injection neutralized
// (see lib/csv.ts) the same way the doctor portal's patient export does.
function fmtCount(c: { count: number | null; suppressed: boolean }): string {
  return c.suppressed ? "<5 (suppressed)" : String(c.count ?? "");
}

export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(ANALYST_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const type = req.nextUrl.searchParams.get("type");

  try {
    let csv: string;
    let filename: string;

    if (type === "regions") {
      const regions = await getRegions();
      csv = toCsv(
        ["Province", "Region (City)", "Visit Count", "Distinct Patients", "Top Condition"],
        regions.map((r) => [r.province, r.region, fmtCount(r.visitCount), fmtCount(r.patientCount), r.topCondition ?? ""])
      );
      filename = "pulseid-analytics-regions";
    } else if (type === "provinces") {
      const provinces = await getProvinces();
      csv = toCsv(
        ["Province", "Cities Reporting", "Visit Count", "Distinct Patients", "Top Condition"],
        provinces.map((p) => [p.province, p.regionCount, fmtCount(p.visitCount), fmtCount(p.patientCount), p.topCondition ?? ""])
      );
      filename = "pulseid-analytics-provinces";
    } else if (type === "conditions") {
      const conditions = await getTopConditions(50);
      csv = toCsv(
        ["Diagnosis", "Count (nationwide)"],
        conditions.map((c) => [c.diagnosis, fmtCount(c.count)])
      );
      filename = "pulseid-analytics-conditions";
    } else if (type === "quality") {
      const rows = await getDataQuality();
      csv = toCsv(
        ["Region", "Recent Week Visits", "Prior Average Visits", "Change %", "Flag"],
        rows.map((r) => [r.region, r.recentWeekVisits, r.priorAverageVisits, r.changePct ?? "", r.flag])
      );
      filename = "pulseid-analytics-data-quality";
    } else {
      return NextResponse.json({ error: "type must be one of: regions, provinces, conditions, quality." }, { status: 400 });
    }

    logAnalystAction({
      analystEmail: session.email,
      analystName: session.name,
      action: "export_csv",
      detail: type,
      ip: requestIp(req),
    });

    return new NextResponse(csv, { headers: csvResponseHeaders(filename) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Export failed." }, { status: 502 });
  }
}
