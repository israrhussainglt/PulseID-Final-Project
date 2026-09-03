"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Button, Field, inputClass } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  // Pre-filled with the bootstrap admin account (see analytics/.env.local)
  // so testers can just hit "Sign in" without having to go dig up
  // credentials first.
  const [email, setEmail] = useState("admin@health.gov");
  const [password, setPassword] = useState("ZUh8dceXto3TGK+Ry9D035FViK8ekoZx");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Login failed.");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="eyebrow text-teal mb-2">PulseID</div>
          <h1 className="font-display text-3xl">Analytics</h1>
          <p className="text-sm text-sage mt-2">National, region-level case data. Aggregate counts only.</p>
        </div>
        <Card className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Analyst email">
              <input
                type="email"
                autoFocus
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@health.gov"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="••••••••"
              />
            </Field>
            {error && <p className="text-sm text-alert">{error}</p>}
            <Button type="submit" disabled={loading || !email || !password} className="w-full">
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </Card>
        <p className="text-xs text-sage text-center mt-4">
          This dashboard never shows patient names or National IDs — regional and national counts only.
        </p>
        <p className="text-xs text-sage text-center mt-2">
          Demo admin credentials are pre-filled above for testing — change them from Account settings after logging in.
        </p>
      </div>
    </main>
  );
}
