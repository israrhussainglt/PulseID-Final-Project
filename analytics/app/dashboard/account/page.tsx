"use client";

import { useEffect, useState } from "react";
import { Card, Eyebrow, Button, Field, inputClass } from "@/components/ui";

type SessionInfo = { name: string; email: string; role: "admin" | "viewer" };

export default function AccountPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSession(data?.session ?? null))
      .catch(() => {});
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not change password.");
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Could not change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <Eyebrow tone="teal">Your account</Eyebrow>
        <h1 className="font-display text-3xl mt-1">Account settings</h1>
        {session && (
          <p className="text-sm text-sage mt-2">
            Signed in as <span className="font-medium text-ink">{session.name}</span> ({session.email}) —{" "}
            <span className="capitalize">{session.role}</span> access.
          </p>
        )}
      </div>

      <Card className="p-6">
        <h2 className="font-display text-lg mb-4">Change password</h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Current password">
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="New password" hint="At least 10 characters.">
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </Field>
          {error && <p className="text-sm text-alert">{error}</p>}
          {success && <p className="text-sm text-teal-dark">Password updated.</p>}
          <Button type="submit" disabled={loading || !currentPassword || !newPassword}>
            {loading ? "Saving…" : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
