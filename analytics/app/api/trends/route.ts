import { NextRequest, NextResponse } from "next/server";
import { verifySession, ANALYST_COOKIE } from "@/lib/auth";
import { getTrend } from "@/lib/api";

// Thin server-side proxy: the browser calls this (same-origin, cookie
// auth) so the TrendExplorer client component can re-fetch on every
// dropdown change without ever holding the ANALYTICS_SERVICE_KEY itself.
export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(ANALYST_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const diagnosis = req.nextUrl.searchParams.get("diagnosis") || "";
  const region = req.nextUrl.searchParams.get("region") || undefined;
  const interval = req.nextUrl.searchParams.get("interval") === "month" ? "month" : "week";
  if (!diagnosis.trim()) return NextResponse.json({ error: "diagnosis is required." }, { status: 400 });

  try {
    const data = await getTrend(diagnosis, { region, interval });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load trend." }, { status: 502 });
  }
}
