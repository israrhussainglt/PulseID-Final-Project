"use client";

import { useEffect, useState } from "react";
import { Card, Eyebrow, Badge } from "@/components/ui";

type AuditEntry = {
  id: string;
  analystEmail: string | null;
  analystName: string | null;
  action: string;
  detail: string | null;
  ip: string | null;
  createdAt: string;
};

const ACTION_LABELS: Record<string, string> = {
  login: "Signed in",
  login_failed: "Failed sign-in attempt",
  logout: "Signed out",
  bulletin_approved: "Approved bulletin",
  bulletin_rejected: "Rejected bulletin",
  bulletin_generated: "Generated bulletin",
  ai_query: "Asked the data (AI)",
  export_csv: "Exported CSV",
  analyst_created: "Added analyst",
  analyst_deactivated: "Deactivated analyst",
  password_changed: "Changed password",
};

const ACTION_TONE: Record<string, "teal" | "alert" | "sage" | "amber"> = {
  login_failed: "alert",
  analyst_deactivated: "amber",
  bulletin_rejected: "amber",
};

// Admin-only (middleware.ts redirects non-admins; /api/audit re-checks
// server-side too). Every sensitive action taken inside this app — not
// patient data, just this app's own account/approval/export activity —
// shows up here, same access-transparency posture the patient portal gives
// patients over their own record on the main backend.
export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((data) => setEntries(data.entries ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow tone="teal">Admin</Eyebrow>
        <h1 className="font-display text-3xl mt-1">Audit log</h1>
        <p className="text-sm text-sage mt-2 max-w-xl">
          Every sign-in, bulletin approval, AI query, export, and account change made inside this app. This is not
          patient data — it's a record of what analysts did with the aggregate dashboard.
        </p>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-teal-light/60 text-teal-dark">
            <tr>
              <th className="text-left font-medium px-4 py-3">When</th>
              <th className="text-left font-medium px-4 py-3">Analyst</th>
              <th className="text-left font-medium px-4 py-3">Action</th>
              <th className="text-left font-medium px-4 py-3">Detail</th>
              <th className="text-left font-medium px-4 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="px-4 py-3 text-xs text-sage whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {e.analystName || e.analystEmail || <span className="text-sage">Unknown</span>}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={ACTION_TONE[e.action] ?? "sage"}>{ACTION_LABELS[e.action] ?? e.action}</Badge>
                </td>
                <td className="px-4 py-3 text-sage max-w-xs truncate" title={e.detail ?? ""}>
                  {e.detail ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-sage font-mono">{e.ip ?? "—"}</td>
              </tr>
            ))}
            {!loading && entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sage">
                  No activity logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
