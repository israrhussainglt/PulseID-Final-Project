import { NextRequest, NextResponse } from "next/server";
import { verifySession, ANALYST_COOKIE } from "@/lib/auth";
import { getForecast } from "@/lib/api";

export async function GET(req: NextRequest) {
  const session = await verifySession(req.cookies.get(ANALYST_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const diagnosis = req.nextUrl.searchParams.get("diagnosis") || "";
  const region = req.nextUrl.searchParams.get("region") || undefined;
  const interval = req.nextUrl.searchParams.get("interval") === "month" ? "month" : "week";
  if (!diagnosis.trim()) return NextResponse.json({ error: "diagnosis is required." }, { status: 400 });

  try {
    const data = await getForecast(diagnosis, { region, interval });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load forecast." }, { status: 502 });
  }
}
