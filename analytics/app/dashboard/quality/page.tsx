import { getDataQuality } from "@/lib/api";
import { Card, Eyebrow, Badge } from "@/components/ui";
import { ExportButton } from "@/components/ExportButton";

export default async function QualityPage() {
  const rows = await getDataQuality();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow tone="teal">Data quality</Eyebrow>
          <h1 className="font-display text-3xl mt-1">Is the pipeline actually working?</h1>
          <p className="text-sm text-sage mt-2 max-w-xl">
            Flags regions where reported visit volume dropped sharply week over week — usually a sign a hospital's
            reporting pipeline broke, not that people stopped getting sick — or rose sharply, which can be a real
            surge or a duplicate-submission bug worth checking.
          </p>
        </div>
        <ExportButton type="quality" />
      </div>

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.region} className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge tone={r.flag === "quiet" ? "alert" : "amber"}>{r.flag === "quiet" ? "Reporting gap" : "Sharp rise"}</Badge>
                <span className="font-medium">{r.region}</span>
              </div>
              <p className="text-sm text-sage">
                {r.recentWeekVisits} visits last week vs an average of {r.priorAverageVisits}/week
                {r.changePct !== null ? ` (${r.changePct > 0 ? "+" : ""}${r.changePct}%)` : ""}.
              </p>
            </div>
          </Card>
        ))}
        {rows.length === 0 && (
          <Card className="p-8 text-center text-sage text-sm">
            No data-quality flags — reporting volume looks consistent across all regions with enough history.
          </Card>
        )}
      </div>
    </div>
  );
}
