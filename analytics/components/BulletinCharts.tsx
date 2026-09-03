"use client";

import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Card } from "@/components/ui";

type ChartData = {
  nationalTrend: { bucket: string; count: number | null }[];
  topConditions: { diagnosis: string; count: number | null }[];
  regionVisits: { region: string; visits: number | null }[];
  alerts: { region: string; diagnosis: string; pctChangeVsBaseline: number; severity: string }[];
};

const SEVERITY_COLOR: Record<string, string> = { high: "#D64550", elevated: "#B8790B", watch: "#4C6663" };

export function BulletinCharts({ chartData }: { chartData: ChartData }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-4">
        <div className="eyebrow text-sage mb-2">Visit volume, nationwide</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.nationalTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#DCE4E3" vertical={false} />
              <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: "#4C6663" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#4C6663" }} />
              <Tooltip formatter={(v: any) => (v === null ? "<5 (suppressed)" : v)} />
              <Line type="monotone" dataKey="count" stroke="#0E7C7B" strokeWidth={2} dot={{ r: 2 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <div className="eyebrow text-sage mb-2">Busiest regions</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.regionVisits} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#DCE4E3" vertical={false} />
              <XAxis dataKey="region" tick={{ fontSize: 10, fill: "#4C6663" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#4C6663" }} />
              <Tooltip formatter={(v: any) => (v === null ? "<5 (suppressed)" : v)} />
              <Bar dataKey="visits" fill="#0E7C7B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <div className="eyebrow text-sage mb-2">Top conditions, nationwide</div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.topConditions} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid stroke="#DCE4E3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: "#4C6663" }} />
              <YAxis type="category" dataKey="diagnosis" width={110} tick={{ fontSize: 10, fill: "#4C6663" }} />
              <Tooltip formatter={(v: any) => (v === null ? "<5 (suppressed)" : v)} />
              <Bar dataKey="count" fill="#B8790B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <div className="eyebrow text-sage mb-2">Alert magnitude (% vs baseline)</div>
        <div className="h-56">
          {chartData.alerts.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-sage">No active alerts this period.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.alerts} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#DCE4E3" vertical={false} />
                <XAxis dataKey="region" tick={{ fontSize: 10, fill: "#4C6663" }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#4C6663" }} unit="%" />
                <Tooltip formatter={(v: any, _n: any, p: any) => [`+${v}%`, p.payload.diagnosis]} />
                <Bar dataKey="pctChangeVsBaseline" radius={[4, 4, 0, 0]}>
                  {chartData.alerts.map((a, i) => (
                    <Cell key={i} fill={SEVERITY_COLOR[a.severity] || "#0E7C7B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}
