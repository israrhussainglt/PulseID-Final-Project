"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Card } from "@/components/ui";

type ConditionOption = { diagnosis: string; count: { count: number | null; suppressed: boolean } };

export function TrendExplorer({
  conditions,
  regions,
}: {
  conditions: ConditionOption[];
  regions: string[];
}) {
  const [diagnosis, setDiagnosis] = useState(conditions[0]?.diagnosis ?? "");
  const [region, setRegion] = useState<string>("");
  const [interval, setIntervalVal] = useState<"week" | "month">("week");
  const [showForecast, setShowForecast] = useState(true);
  const [chartData, setChartData] = useState<{ bucket: string; actual: number | null; forecast: number | null }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!diagnosis) return;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ diagnosis, interval });
    if (region) qs.set("region", region);

    Promise.all([
      fetch(`/api/trends?${qs}`).then((r) => r.json()),
      showForecast ? fetch(`/api/forecast?${qs}`).then((r) => r.json()) : Promise.resolve(null),
    ])
      .then(([trendData, forecastData]) => {
        if (trendData?.error) throw new Error(trendData.error);
        const points = (trendData.points ?? []) as { bucket: string; count: { count: number | null; suppressed: boolean } }[];
        const actualRows = points.map((p) => ({
          bucket: p.bucket,
          actual: p.count.suppressed ? null : p.count.count,
          forecast: null as number | null,
        }));

        if (forecastData && !forecastData.error && forecastData.forecast?.length) {
          // bridge the last actual point into the forecast line so it's visually continuous
          const last = actualRows[actualRows.length - 1];
          if (last) last.forecast = last.actual;
          for (const f of forecastData.forecast) {
            actualRows.push({ bucket: f.bucket, actual: null, forecast: f.count });
          }
        }
        setChartData(actualRows);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [diagnosis, region, interval, showForecast]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={diagnosis}
          onChange={(e) => setDiagnosis(e.target.value)}
          className="focus-ring rounded-lg border border-line px-3 py-2 text-sm bg-white capitalize"
        >
          {conditions.map((c) => (
            <option key={c.diagnosis} value={c.diagnosis} className="capitalize">
              {c.diagnosis}
            </option>
          ))}
        </select>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="focus-ring rounded-lg border border-line px-3 py-2 text-sm bg-white"
        >
          <option value="">All regions</option>
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="flex rounded-lg border border-line overflow-hidden text-sm">
          {(["week", "month"] as const).map((iv) => (
            <button
              key={iv}
              onClick={() => setIntervalVal(iv)}
              className={`px-3 py-2 capitalize focus-ring ${interval === iv ? "bg-ink text-white" : "bg-white hover:bg-teal-light/60"}`}
            >
              {iv}ly
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-sage ml-1">
          <input type="checkbox" checked={showForecast} onChange={(e) => setShowForecast(e.target.checked)} className="accent-teal" />
          Show forecast
        </label>
      </div>

      <Card className="p-5 h-80">
        {error && <p className="text-sm text-alert">{error}</p>}
        {!error && loading && <p className="text-sm text-sage">Loading…</p>}
        {!error && !loading && chartData.length === 0 && (
          <p className="text-sm text-sage">No recorded cases for this selection.</p>
        )}
        {!error && !loading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="#DCE4E3" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#4C6663" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#4C6663" }} />
              <Tooltip formatter={(value: any) => (value === null || value === undefined ? "<5 (suppressed)" : value)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="actual" name="Reported cases" stroke="#0E7C7B" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
              {showForecast && (
                <Line
                  type="monotone"
                  dataKey="forecast"
                  name="Forecast"
                  stroke="#B8790B"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={{ r: 3 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
      <p className="text-xs text-sage">
        Gaps in the solid line mark a period where the true count was below 5 and is withheld rather than shown
        exactly. The dashed line is a simple linear projection — a rough "where this is headed," not a clinical
        forecast.
      </p>
    </div>
  );
}
