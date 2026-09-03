import { Eyebrow } from "@/components/ui";
import { AiSummaryBox } from "@/components/AiSummaryBox";

export default function ResourcesPage() {
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow tone="teal">Resource attention</Eyebrow>
        <h1 className="font-display text-3xl mt-1">Where to look first</h1>
        <p className="text-sm text-sage mt-2 max-w-xl">
          Cross-references regional visit load, active alerts, and reporting gaps into a short list of places
          worth a closer look. These are suggestions for a human planner to evaluate, never automated decisions.
        </p>
      </div>
      <AiSummaryBox
        endpoint="/api/resources/suggest"
        buttonLabel="Generate suggestions"
        emptyHint="Set ANTHROPIC_API_KEY in analytics/.env.local to enable this."
      />
    </div>
  );
}
