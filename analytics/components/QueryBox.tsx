"use client";

import { useState } from "react";
import { Button, Card, inputClass } from "@/components/ui";

const SUGGESTIONS = [
  "Which region has the most cases right now?",
  "Is there anything I should be worried about this week?",
  "How does Karachi compare to the national picture?",
];

export function QueryBox() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<{ q: string; a: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!q.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to answer.");
      setHistory((h) => [...h, { q, a: data.answer }]);
      setQuestion("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(question);
          }}
          className="flex gap-2"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about the national data…"
            className={inputClass}
          />
          <Button type="submit" disabled={loading || !question.trim()}>
            {loading ? "Asking…" : "Ask"}
          </Button>
        </form>
        {history.length === 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => ask(s)}
                className="focus-ring text-xs bg-teal-light text-teal-dark rounded-full px-3 py-1.5 hover:bg-teal-light/70"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {error && <p className="text-sm text-alert mt-3">{error}</p>}
      </Card>

      <div className="space-y-3">
        {[...history].reverse().map((h, i) => (
          <Card key={i} className="p-5">
            <p className="text-sm font-medium mb-2">{h.q}</p>
            <p className="text-sm text-sage leading-relaxed whitespace-pre-wrap">{h.a}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
