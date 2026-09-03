"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button, Card, Eyebrow, Badge } from "@/components/ui";
import { BulletinCharts } from "@/components/BulletinCharts";

type Bulletin = {
  id: string;
  period: "weekly" | "monthly";
  periodLabel: string;
  narrativeMd: string;
  chartData: any;
  status: "pending_review" | "approved" | "rejected";
  generatedAt: string;
  generatedBy: "scheduler" | "manual";
  reviewedAt: string | null;
  reviewerNote: string | null;
  reviewedBy: string | null;
};

const STATUS_TONE = { pending_review: "amber", approved: "teal", rejected: "alert" } as const;
const STATUS_LABEL = { pending_review: "Pending review", approved: "Approved", rejected: "Rejected" } as const;

export default function BulletinsPage() {
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<"weekly" | "monthly" | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setIsAdmin(data?.session?.role === "admin"))
      .catch(() => {});
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bulletins");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load bulletins.");
      setBulletins(data.bulletins);
      if (!selectedId && data.bulletins.length > 0) setSelectedId(data.bulletins[0].id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(period: "weekly" | "monthly") {
    setGenerating(period);
    setError(null);
    try {
      const res = await fetch("/api/bulletins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to generate.");
      setBulletins((b) => [data.bulletin, ...b]);
      setSelectedId(data.bulletin.id);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  }

  async function review(id: string, action: "approve" | "reject") {
    setReviewing(true);
    try {
      const res = await fetch(`/api/bulletins/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to review.");
      setBulletins((bs) => bs.map((b) => (b.id === id ? data.bulletin : b)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setReviewing(false);
    }
  }

  function download(b: Bulletin) {
    const blob = new Blob([b.narrativeMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pulseid-bulletin-${b.periodLabel.replace(/\s+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selected = bulletins.find((b) => b.id === selectedId) || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 no-print">
        <div>
          <Eyebrow tone="teal">Bulletins</Eyebrow>
          <h1 className="font-display text-3xl mt-1">Weekly &amp; monthly epidemiological bulletins</h1>
          <p className="text-sm text-sage mt-2 max-w-2xl">
            Auto-generated on a schedule (see <code className="text-xs bg-line/60 px-1 rounded">npm run scheduler</code>)
            or on demand below — every bulletin lands here as <strong>pending review</strong> with the charts it was
            written from. Nothing goes out until an analyst approves it.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => generate("weekly")} disabled={generating !== null}>
            {generating === "weekly" ? "Generating…" : "Generate weekly now"}
          </Button>
          <Button variant="secondary" onClick={() => generate("monthly")} disabled={generating !== null}>
            {generating === "monthly" ? "Generating…" : "Generate monthly now"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-alert no-print">{error}</p>}

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-2 no-print">
          {loading && <p className="text-sm text-sage">Loading…</p>}
          {!loading && bulletins.length === 0 && (
            <Card className="p-4 text-sm text-sage">No bulletins yet — generate one above.</Card>
          )}
          {bulletins.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedId(b.id)}
              className={`focus-ring w-full text-left rounded-xl border p-3 transition-colors ${
                b.id === selectedId ? "border-teal bg-teal-light/50" : "border-line bg-white hover:border-teal/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-medium capitalize">{b.period}</span>
                <Badge tone={STATUS_TONE[b.status]}>{STATUS_LABEL[b.status]}</Badge>
              </div>
              <div className="text-xs text-sage">{b.periodLabel}</div>
              <div className="text-xs text-sage/70 mt-0.5">{b.generatedBy === "scheduler" ? "Auto-generated" : "Manually generated"}</div>
            </button>
          ))}
        </div>

        <div>
          {!selected && !loading && (
            <Card className="p-8 text-center text-sage text-sm">Select a bulletin, or generate a new one.</Card>
          )}
          {selected && (
            <div className="space-y-5">
              <Card className="p-4 flex flex-wrap items-center justify-between gap-3 no-print">
                <div className="flex items-center gap-2">
                  <Badge tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                  <span className="text-sm text-sage">
                    Generated {new Date(selected.generatedAt).toLocaleString()}
                    {selected.reviewedAt
                      ? ` · reviewed ${new Date(selected.reviewedAt).toLocaleString()}${selected.reviewedBy ? ` by ${selected.reviewedBy}` : ""}`
                      : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  {selected.status === "pending_review" && isAdmin && (
                    <>
                      <Button variant="secondary" onClick={() => review(selected.id, "reject")} disabled={reviewing}>
                        Reject
                      </Button>
                      <Button variant="primary" onClick={() => review(selected.id, "approve")} disabled={reviewing}>
                        Approve
                      </Button>
                    </>
                  )}
                  {selected.status === "pending_review" && !isAdmin && (
                    <span className="text-xs text-sage italic">Awaiting admin review</span>
                  )}
                  <Button variant="secondary" onClick={() => download(selected)}>
                    Download .md
                  </Button>
                  <Button variant="secondary" onClick={() => window.print()}>
                    Print / Save as PDF
                  </Button>
                </div>
              </Card>

              <BulletinCharts chartData={selected.chartData} />

              <Card className="p-8 print-page">
                <article>
                  <ReactMarkdown
                    components={{
                      h1: (props) => <h1 className="font-display text-2xl mb-3" {...props} />,
                      h2: (props) => <h2 className="font-display text-lg mt-6 mb-2 text-teal-dark" {...props} />,
                      p: (props) => <p className="text-sm leading-relaxed mb-3" {...props} />,
                      ul: (props) => <ul className="list-disc pl-5 text-sm space-y-1 mb-3" {...props} />,
                      li: (props) => <li {...props} />,
                      strong: (props) => <strong className="font-semibold text-ink" {...props} />,
                    }}
                  >
                    {selected.narrativeMd}
                  </ReactMarkdown>
                </article>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
