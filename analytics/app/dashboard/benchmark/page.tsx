import { getRegions, getBenchmark } from "@/lib/api";
import { Card, Eyebrow } from "@/components/ui";
import { SuppressedValue } from "@/components/SuppressedValue";

export default async function BenchmarkPage({ searchParams }: { searchParams: { region?: string } }) {
  const regions = await getRegions();
  const region = searchParams.region || regions[0]?.region || "";
  const benchmark = region ? await getBenchmark(region) : null;

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow tone="teal">Benchmark</Eyebrow>
        <h1 className="font-display text-3xl mt-1">One region vs the national picture</h1>
        <p className="text-sm text-sage mt-2">
          For each of the top nationwide conditions, how big a share of this region's visits it represents,
          compared to its share nationwide. A region-share well above the national-share means that condition
          shows up disproportionately more here than elsewhere.
        </p>
        <p className="text-sm text-sage mt-2">
          Region is based on the hospital where each visit happened, not a patient's home address.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {regions.map((r) => (
          <a
            key={r.region}
            href={`/dashboard/benchmark?region=${encodeURIComponent(r.region)}`}
            className={`focus-ring px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              r.region === region ? "bg-ink text-white" : "bg-white border border-line text-sage hover:border-teal hover:text-teal-dark"
            }`}
          >
            {r.region}
          </a>
        ))}
      </div>

      {benchmark && (
        <Card className="overflow-hidden">
          <div className="px-4 py-3 border-b border-line flex justify-between text-sm text-sage">
            <span>
              {benchmark.region}: <span className="font-medium text-ink">{benchmark.totalRegionVisits.toLocaleString()}</span> total visits
            </span>
            <span>
              Nationwide: <span className="font-medium text-ink">{benchmark.totalNationalVisits.toLocaleString()}</span> total visits
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-teal-light/60 text-teal-dark">
              <tr>
                <th className="text-left font-medium px-4 py-3">Condition</th>
                <th className="text-right font-medium px-4 py-3">{benchmark.region} cases</th>
                <th className="text-right font-medium px-4 py-3">Share of {benchmark.region}'s visits</th>
                <th className="text-right font-medium px-4 py-3">Share nationwide</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {benchmark.rows.map((row) => {
                const above = row.regionShare !== null && row.nationalShare !== null && row.regionShare > row.nationalShare * 1.3;
                return (
                  <tr key={row.diagnosis}>
                    <td className="px-4 py-3 capitalize">{row.diagnosis}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      <SuppressedValue value={row.regionCount} />
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${above ? "text-alert font-semibold" : ""}`}>
                      {row.regionShare !== null ? `${row.regionShare}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sage">
                      {row.nationalShare !== null ? `${row.nationalShare}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
