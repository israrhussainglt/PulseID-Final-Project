
// Every function here is meant to run server-side only — in Next.js route
// handlers/server components, or in the standalone scheduler script
// (scripts/scheduler.ts), never in the browser. No client component in
// this app imports this file directly (they call same-origin API routes
// instead), so ANALYTICS_SERVICE_KEY never reaches the browser bundle.
// (Deliberately not using the `server-only` package here, since it throws
// unconditionally outside Next's webpack build — including in the plain
// Node process the scheduler runs as.)

const API_BASE = process.env.API_INTERNAL_URL || "http://localhost:4000";

export type SuppressibleCount = { count: number | null; suppressed: boolean };

export type AnalyticsOverview = {
  totalPatients: number;
  totalVisits: number;
  totalHospitals: number;
  totalDoctors: number;
  activeRegions: number;
  earliestVisit: string | null;
  latestVisit: string | null;
};

export type RegionSummaryRow = {
  region: string;
  province: string;
  visitCount: SuppressibleCount;
  patientCount: SuppressibleCount;
  topCondition: string | null;
};

export type ProvinceSummaryRow = {
  province: string;
  regionCount: number;
  visitCount: SuppressibleCount;
  patientCount: SuppressibleCount;
  topCondition: string | null;
};

export type HospitalSummaryRow = {
  hospitalId: string;
  hospitalName: string;
  region: string;
  province: string;
  doctorCount: number;
  visitCount: SuppressibleCount;
  patientCount: SuppressibleCount;
};

export type ConditionCountRow = { diagnosis: string; count: SuppressibleCount };
export type TrendPoint = { bucket: string; count: SuppressibleCount };

async function analyticsFetch<T>(path: string): Promise<T> {
  const key = process.env.ANALYTICS_SERVICE_KEY;
  if (!key) {
    throw new Error("ANALYTICS_SERVICE_KEY is not set in this app's environment.");
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-analytics-key": key },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) {
      // By far the most common cause: ANALYTICS_SERVICE_KEY drifting out of
      // sync between this app and the backend. docker-compose.yml can't hit
      // this (both services read the same top-level env var), but separate
      // backend/.env and analytics/.env files in local/manual setups can
      // easily end up with two different values.
      throw new Error(
        `Analytics API ${path} failed: 401 Not authenticated. ANALYTICS_SERVICE_KEY on this app doesn't match ANALYTICS_SERVICE_KEY on the backend — they must be identical. (${body})`
      );
    }
    throw new Error(`Analytics API ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export function getOverview(): Promise<AnalyticsOverview> {
  return analyticsFetch<AnalyticsOverview>("/api/analytics/overview");
}

export async function getRegions(): Promise<RegionSummaryRow[]> {
  const data = await analyticsFetch<{ regions: RegionSummaryRow[] }>("/api/analytics/regions");
  return data.regions;
}

export async function getProvinces(): Promise<ProvinceSummaryRow[]> {
  const data = await analyticsFetch<{ provinces: ProvinceSummaryRow[] }>("/api/analytics/provinces");
  return data.provinces;
}

// Hospital-level drill-down. Pass a region to scope it to that region's
// hospitals only (used under each region row); omit it to get every
// hospital nationwide in one call. Always returns an array — a region with
// zero hospitals on file simply comes back as [], not an error.
export async function getHospitals(region?: string): Promise<HospitalSummaryRow[]> {
  const qs = region ? `?region=${encodeURIComponent(region)}` : "";
  const data = await analyticsFetch<{ hospitals: HospitalSummaryRow[] }>(`/api/analytics/hospitals${qs}`);
  return data.hospitals;
}

export async function getTopConditions(limit = 10, region?: string): Promise<ConditionCountRow[]> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (region) qs.set("region", region);
  const data = await analyticsFetch<{ conditions: ConditionCountRow[] }>(`/api/analytics/conditions?${qs}`);
  return data.conditions;
}

export async function getTrend(
  diagnosis: string,
  opts: { region?: string; interval?: "week" | "month" } = {}
): Promise<{ diagnosis: string; interval: string; points: TrendPoint[] }> {
  const qs = new URLSearchParams({ diagnosis, interval: opts.interval ?? "week" });
  if (opts.region) qs.set("region", opts.region);
  return analyticsFetch(`/api/analytics/trends?${qs}`);
}

export async function getMatrix(topN = 6): Promise<{ regions: string[]; diagnoses: string[]; cells: { region: string; diagnosis: string; count: SuppressibleCount }[] }> {
  return analyticsFetch(`/api/analytics/matrix?topN=${topN}`);
}

export type OutbreakAlert = {
  region: string;
  diagnosis: string;
  latestCount: number;
  baselineAverage: number;
  ratio: number;
  severity: "watch" | "elevated" | "high";
};

export async function getAlerts(): Promise<OutbreakAlert[]> {
  const data = await analyticsFetch<{ alerts: OutbreakAlert[] }>("/api/analytics/alerts");
  return data.alerts;
}

export type RegionBenchmarkRow = {
  diagnosis: string;
  regionCount: SuppressibleCount;
  regionShare: number | null;
  nationalShare: number | null;
};

export async function getBenchmark(region: string): Promise<{ region: string; totalRegionVisits: number; totalNationalVisits: number; rows: RegionBenchmarkRow[] }> {
  return analyticsFetch(`/api/analytics/benchmark?region=${encodeURIComponent(region)}`);
}

export type ForecastPoint = { bucket: string; count: number; projected: boolean };

export async function getForecast(
  diagnosis: string,
  opts: { region?: string; interval?: "week" | "month"; periodsAhead?: number } = {}
): Promise<{ diagnosis: string; interval: string; history: ForecastPoint[]; forecast: ForecastPoint[] }> {
  const qs = new URLSearchParams({ diagnosis, interval: opts.interval ?? "week", periodsAhead: String(opts.periodsAhead ?? 4) });
  if (opts.region) qs.set("region", opts.region);
  return analyticsFetch(`/api/analytics/forecast?${qs}`);
}

export type DataQualityRow = {
  region: string;
  recentWeekVisits: number;
  priorAverageVisits: number;
  changePct: number | null;
  flag: "quiet" | "normal" | "surging";
};

export async function getDataQuality(): Promise<DataQualityRow[]> {
  const data = await analyticsFetch<{ rows: DataQualityRow[] }>("/api/analytics/quality");
  return data.rows;
}

export async function getNationalTrend(interval: "week" | "month" = "week", periods = 10): Promise<{ interval: string; points: TrendPoint[] }> {
  return analyticsFetch(`/api/analytics/national-trend?interval=${interval}&periods=${periods}`);
}
