import { Card } from "@/components/ui";

export function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="eyebrow text-sage">{label}</div>
      <div className="font-display text-3xl mt-1.5">{value}</div>
      {hint && <div className="text-xs text-sage mt-1">{hint}</div>}
    </Card>
  );
}
