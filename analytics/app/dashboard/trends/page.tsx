import { getTopConditions, getRegions } from "@/lib/api";
import { TrendExplorer } from "@/components/TrendExplorer";
import { Card, Eyebrow } from "@/components/ui";

export default async function TrendsPage() {
  const [conditions, regions] = await Promise.all([getTopConditions(20), getRegions()]);

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow tone="teal">Trends</Eyebrow>
        <h1 className="font-display text-3xl mt-1">Where a condition is headed</h1>
        <p className="text-sm text-sage mt-2">
          Case counts over time for a chosen condition, nationwide or filtered to one region, with a simple
          forward projection — the shape you'd want to spot an outbreak forming.
        </p>
      </div>
      {conditions.length === 0 ? (
        <Card className="p-8 text-center text-sage text-sm">No diagnosis data recorded yet.</Card>
      ) : (
        <TrendExplorer conditions={conditions} regions={regions.map((r) => r.region)} />
      )}
    </div>
  );
}
