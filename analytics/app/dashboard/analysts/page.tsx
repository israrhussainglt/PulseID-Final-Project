"use client";

import { useEffect, useState } from "react";
import { Card, Eyebrow, Button, Field, inputClass, selectClass, Badge } from "@/components/ui";

type Analyst = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

// Admin-only (redirected away by middleware.ts if not an admin, and every
// underlying API call re-checks the role server-side regardless). Lets a
// ministry-of-health deployment onboard and offboard analysts without
// editing the SQLite file by hand.
export default function AnalystsPage() {
  const [analysts, setAnalysts] = useState<Analyst[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"viewer" | "admin">("viewer");
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/analysts");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data.error || "Could not load analyst accounts.");
        return;
      }
      setAnalysts(data.analysts);
    } catch {
      setLoadError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/analysts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not create analyst.");
      setName("");
      setEmail("");
      setPassword("");
      setRole("viewer");
      await load();
    } catch (err: any) {
      setError(err.message || "Could not create analyst.");
    } finally {
      setCreating(false);
    }
  }

  async function onDeactivate(id: string) {
    if (!confirm("Deactivate this analyst? They'll no longer be able to sign in.")) return;
    try {
      const res = await fetch(`/api/analysts/${id}`, { method: "DELETE" });
      if (res.ok) {
        await load();
      } else {
        const data = await res.json().catch(() => ({}));
        setLoadError(data.error || "Could not deactivate this analyst.");
      }
    } catch {
      setLoadError("Could not reach the server. Please try again.");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow tone="teal">Admin</Eyebrow>
        <h1 className="font-display text-3xl mt-1">Analyst accounts</h1>
        <p className="text-sm text-sage mt-2 max-w-xl">
          Named accounts, not a shared password — every bulletin approval and audit-log entry is tied to whoever is
          signed in. Viewers can see every dashboard page and use the AI tools; admins can also approve bulletins,
          manage accounts, and read the audit log.
        </p>
      </div>

      <Card className="p-6 max-w-lg">
        <h2 className="font-display text-lg mb-4">Add an analyst</h2>
        <form onSubmit={onCreate} className="space-y-4">
          <Field label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Dr. Amina Raza" />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="analyst@health.gov"
            />
          </Field>
          <Field label="Temporary password" hint="At least 10 characters — they can change it after signing in.">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value as "viewer" | "admin")} className={selectClass}>
              <option value="viewer">Viewer — read-only + AI tools</option>
              <option value="admin">Admin — everything, plus approvals & account management</option>
            </select>
          </Field>
          {error && <p className="text-sm text-alert">{error}</p>}
          <Button type="submit" disabled={creating || !name || !email || !password}>
            {creating ? "Adding…" : "Add analyst"}
          </Button>
        </form>
      </Card>

      {loadError && (
        <p className="text-sm text-alert -mt-4">{loadError}</p>
      )}

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-teal-light/60 text-teal-dark">
            <tr>
              <th className="text-left font-medium px-4 py-3">Name</th>
              <th className="text-left font-medium px-4 py-3">Email</th>
              <th className="text-left font-medium px-4 py-3">Role</th>
              <th className="text-left font-medium px-4 py-3">Status</th>
              <th className="text-left font-medium px-4 py-3">Last login</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {analysts.map((a) => (
              <tr key={a.id}>
                <td className="px-4 py-3 font-medium">{a.name}</td>
                <td className="px-4 py-3 text-sage">{a.email}</td>
                <td className="px-4 py-3 capitalize">{a.role}</td>
                <td className="px-4 py-3">
                  <Badge tone={a.active ? "teal" : "sage"}>{a.active ? "Active" : "Deactivated"}</Badge>
                </td>
                <td className="px-4 py-3 text-sage text-xs">
                  {a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "Never"}
                </td>
                <td className="px-4 py-3 text-right">
                  {a.active && (
                    <button
                      onClick={() => onDeactivate(a.id)}
                      className="focus-ring text-xs font-medium text-alert hover:underline"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && analysts.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sage">
                  No analyst accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
