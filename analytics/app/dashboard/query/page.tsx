import { Eyebrow } from "@/components/ui";
import { QueryBox } from "@/components/QueryBox";

export default function QueryPage() {
  return (
    <div className="space-y-6">
      <div>
        <Eyebrow tone="teal">Ask the data</Eyebrow>
        <h1 className="font-display text-3xl mt-1">Ask in plain English</h1>
        <p className="text-sm text-sage mt-2">
          Answers are generated strictly from the same aggregate counts every other page on this dashboard shows —
          the AI never sees, and can never reach, an individual patient record.
        </p>
      </div>
      <QueryBox />
    </div>
  );
}
