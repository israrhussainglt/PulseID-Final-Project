import { NextRequest } from "next/server";

// Lightweight in-memory sliding-window rate limiter — same approach and
// same "no Redis needed" reasoning as backend/src/lib/rate-limit.ts. This
// app runs as a single Node process (see Dockerfile — `next start`, no
// clustering), so an in-memory map is enough to blunt password-guessing
// against the login route. If this is ever deployed with multiple
// instances behind a load balancer, swap this for a shared store (Redis)
// since each instance would otherwise track its own counters.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true };
}

export function requestIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  // NextRequest doesn't expose a socket address in the App Router, and this
  // app (see docker-compose.yml) is commonly run with no reverse proxy in
  // front of it, so x-forwarded-for is frequently absent. IMPORTANT: never
  // fall back to a shared constant like "unknown" for rate-limit keys — a
  // shared IP bucket rate-limits every user of the app *together*, so a
  // handful of mistyped passwords from unrelated people locks everyone out.
  // Callers that rate-limit by IP should combine it with something
  // request-specific (e.g. the attempted email) instead.
  return "unknown";
}
