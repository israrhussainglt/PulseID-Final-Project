"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

// A generic "ask the AI to write something over this data" box, reused by
// Alerts (narrate), Reports (bulletin), and Resources (suggestions). Each
// caller passes its own endpoint and button label; this component only
// handles the loading/error/render lifecycle so all three feel identical.
export function AiSummaryBox({
  endpoint,
  buttonLabel,
  emptyHint,
}: {
  endpoint: string;
  buttonLabel: string;
  emptyHint?: string;
}) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate.");
      setText(data.summary || data.report || "");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="eyebrow text-amber">AI-drafted</div>
        <Button variant="secondary" onClick={generate} disabled={loading}>
          {loading ? "Thinking…" : buttonLabel}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-alert">
          {error}
          {error.includes("ANTHROPIC_API_KEY") && emptyHint && <span className="block text-sage mt-1">{emptyHint}</span>}
        </p>
      )}
      {!error && !text && !loading && <p className="text-sm text-sage">Click to generate — an AI-written summary over the aggregate data above, reviewed by you before it's shared further.</p>}
      {text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>}
    </Card>
  );
}
