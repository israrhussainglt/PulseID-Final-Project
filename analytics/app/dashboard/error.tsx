"use client";

import { useEffect } from "react";
import { Card, Badge, Button } from "@/components/ui";

// Next.js renders this for any error thrown while rendering a page under
// /dashboard (including the awaited getOverview()/getRegions()/etc. calls
// in these server components) instead of the default crash overlay. Without
// this file, a single failed backend call — wrong ANALYTICS_SERVICE_KEY,
// backend temporarily down, a network blip — took down every page under
// /dashboard with a raw stack trace and no way to recover without a full
// reload.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[analytics] dashboard error:", error);
  }, [error]);

  const isAuthMismatch = /401|not authenticated/i.test(error.message);
  const isConnRefused = /ECONNREFUSED|fetch failed/i.test(error.message);

  return (
    <div className="max-w-xl mx-auto mt-16">
      <Card className="p-6">
        <Badge tone="alert">Couldn't load this page</Badge>
        <h1 className="font-display text-xl mt-3">Something went wrong talking to the backend</h1>

        {isAuthMismatch ? (
          <p className="text-sm text-sage mt-2">
            The analytics service couldn't authenticate with the backend API. This almost always
            means <code className="text-xs bg-line px-1 py-0.5 rounded">ANALYTICS_SERVICE_KEY</code> is
            set to two different values — one for this app, one for the backend. They have to be
            identical. Check <code className="text-xs bg-line px-1 py-0.5 rounded">analytics/.env</code>{" "}
            against <code className="text-xs bg-line px-1 py-0.5 rounded">backend/.env</code> (or, under
            docker-compose, the single root <code className="text-xs bg-line px-1 py-0.5 rounded">.env</code>).
          </p>
        ) : isConnRefused ? (
          <p className="text-sm text-sage mt-2">
            The analytics service couldn't reach the backend API at all. Make sure the backend is
            running and that <code className="text-xs bg-line px-1 py-0.5 rounded">API_INTERNAL_URL</code>{" "}
            points at it.
          </p>
        ) : (
          <p className="text-sm text-sage mt-2">{error.message}</p>
        )}

        <Button className="mt-4" onClick={() => reset()}>
          Try again
        </Button>
      </Card>
    </div>
  );
}
