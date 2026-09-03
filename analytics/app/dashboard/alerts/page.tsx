import { getAlerts } from "@/lib/api";
import { Card, Eyebrow, Badge } from "@/components/ui";
import { AiSummaryBox } from "@/components/AiSummaryBox";

const SEVERITY_TONE = { high: "alert", elevated: "amber", watch: "sage" } as const;
const SEVERITY_LABEL = { high: "High", elevated: "Elevated", watch: "Watch" } as const;

export default async function AlertsPage() {
  const alerts = await getAlerts();

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow tone="alert">Outbreak alerts</Eyebrow>
        <h1 className="font-display text-3xl mt-1">Where cases are rising fastest</h1>
        <p className="text-sm text-sage mt-2">
          A region/condition is flagged when its most recent week is at least ~1.8x its own recent baseline —
          a simple, explainable ratio, not a black-box model. Recomputed on every page load.
        </p>
      </div>

      {alerts.length > 0 && <AiSummaryBox endpoint="/api/alerts/narrate" buttonLabel="Draft a briefing" emptyHint="Set ANTHROPIC_API_KEY in analytics/.env.local to enable this." />}

      <div className="space-y-3">
        {alerts.map((a) => (
          <Card key={`${a.region}-${a.diagnosis}`} className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge tone={SEVERITY_TONE[a.severity]}>{SEVERITY_LABEL[a.severity]}</Badge>
                <span className="font-medium capitalize">{a.diagnosis}</span>
                <span className="text-sage">in</span>
                <span className="font-medium">{a.region}</span>
              </div>
              <p className="text-sm text-sage">
                {a.latestCount} cases last week vs a baseline average of {a.baselineAverage}/week — {a.ratio}x baseline.
              </p>
            </div>
          </Card>
        ))}
        {alerts.length === 0 && (
          <Card className="p-8 text-center text-sage text-sm">
            No active alerts. Every region's recent case volume looks consistent with its own baseline.
          </Card>
        )}
      </div>
    </div>
  );
}
