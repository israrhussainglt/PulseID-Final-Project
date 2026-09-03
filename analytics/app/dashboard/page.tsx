import { getOverview, getRegions, getProvinces, getTopConditions, getAlerts } from "@/lib/api";
import { KpiCard } from "@/components/KpiCard";
import { SuppressedValue } from "@/components/SuppressedValue";
import { Card, Badge, Eyebrow } from "@/components/ui";
import { ExportButton } from "@/components/ExportButton";
import Link from "next/link";

export default async function OverviewPage() {
  const [overview, regions, provinces, conditions, alerts] = await Promise.all([
    getOverview(),
    getRegions(),
    getProvinces(),
    getTopConditions(8),
    getAlerts(),
  ]);

  const topRegions = regions.slice(0, 5);
  const maxConditionCount = Math.max(1, ...conditions.map((c) => c.count.count ?? 0));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Eyebrow tone="teal">National overview</Eyebrow>
          <h1 className="font-display text-3xl mt-1">
            Every hospital, one picture
          </h1>
          <p className="text-sm text-sage mt-2">
            Aggregated across every hospital on PulseID
            {overview.earliestVisit && overview.latestVisit
              ? ` · visits recorded ${overview.earliestVisit.slice(0, 10)} → ${overview.latestVisit.slice(0, 10)}`
              : ""}
            .
          </p>
        </div>
        {alerts.length > 0 && (
          <Link href="/dashboard/alerts">
            <Badge tone="alert">{alerts.length} active alert{alerts.length > 1 ? "s" : ""} →</Badge>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total visits" value={overview.totalVisits.toLocaleString()} />
        <KpiCard label="Patients on file" value={overview.totalPatients.toLocaleString()} />
        <KpiCard label="Hospitals reporting" value={overview.totalHospitals.toLocaleString()} />
        <KpiCard label="Active regions" value={overview.activeRegions.toLocaleString()} hint="Distinct hospital cities with visits" />
        <KpiCard label="Provinces covered" value={provinces.length.toLocaleString()} hint="Incl. Gilgit-Baltistan & AJK" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg">Busiest regions</h2>
            <Link href="/dashboard/regions" className="text-sm text-teal-dark font-medium hover:underline">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {topRegions.map((r) => (
              <li key={r.region} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{r.region}</div>
                  <div className="text-xs text-sage">
                    {r.province}
                    {r.topCondition ? ` · Top condition: ${r.topCondition}` : ""}
                  </div>
                </div>
                <SuppressedValue value={r.visitCount} className="font-mono text-sm" />
              </li>
            ))}
            {topRegions.length === 0 && <li className="py-4 text-sm text-sage">No visit data yet.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg">Most common conditions</h2>
            <div className="flex items-center gap-3">
              <ExportButton type="conditions" label="Export" />
              <Link href="/dashboard/trends" className="text-sm text-teal-dark font-medium hover:underline">
                See trends →
              </Link>
            </div>
          </div>
          <ul className="space-y-2.5">
            {conditions.map((c) => (
              <li key={c.diagnosis}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="capitalize">{c.diagnosis}</span>
                  <SuppressedValue value={c.count} className="font-mono text-xs text-sage" />
                </div>
                <div className="h-1.5 rounded-full bg-line overflow-hidden">
                  <div
                    className="h-full bg-teal rounded-full"
                    style={{ width: `${Math.max(4, ((c.count.count ?? 4) / maxConditionCount) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
            {conditions.length === 0 && <li className="text-sm text-sage">No diagnosis data yet.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
