
// Wrapper around whichever LLM provider is configured. Every AI feature in
// this app (natural-language query, alert narration, bulletin writing,
// resource suggestions) goes through this one function so there's exactly
// one place that owns API keys, model names, and the "degrade gracefully
// if unset" behavior.
//
// IMPORTANT: this only ever receives already-aggregated data (counts by
// region/diagnosis/time) that lib/api.ts pulled from the backend — never
// raw patient records. The model is a writer/summarizer/interpreter over
// numbers that are already safe to show an analyst, not a second path to
// patient data.
//
// Two providers are supported, picked automatically from whichever key is
// present (OpenRouter takes priority if both are set — set AI_PROVIDER to
// override explicitly):
//  - OpenRouter (OPENROUTER_API_KEY) — OpenAI-compatible /chat/completions,
//    gives you a choice of many underlying models through one key.
//  - Anthropic direct (ANTHROPIC_API_KEY) — the native Messages API.

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const PROVIDER: "openrouter" | "anthropic" | null =
  (process.env.AI_PROVIDER as "openrouter" | "anthropic" | undefined) ??
  (OPENROUTER_KEY ? "openrouter" : ANTHROPIC_KEY ? "anthropic" : null);

// Verify current model names/pricing at https://openrouter.ai/models or
// https://docs.claude.com before deploying — overridable via env since
// model names/availability change over time.
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "anthropic/claude-sonnet-4.5";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";

export const AI_CONFIGURED = PROVIDER !== null;
export const AI_PROVIDER_LABEL = PROVIDER === "openrouter" ? `OpenRouter (${OPENROUTER_MODEL})` : PROVIDER === "anthropic" ? `Anthropic (${ANTHROPIC_MODEL})` : "not configured";

// Every AI feature here is called synchronously from a user-facing request
// (someone is waiting on a dashboard page for this to finish), so a hung
// upstream connection must not hang the route forever. 25s leaves headroom
// under typical platform request limits (e.g. a 30s serverless timeout)
// while still being generous for a ~1000-token generation.
const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 25_000;

// Transient-only retry: one retry, only for network failures and 429/5xx —
// never for 4xx client errors (bad key, bad request shape), which will
// just fail the same way again. Keeps the worst case at two calls, not an
// unbounded loop, and a short fixed backoff is enough for the kind of
// blip this is meant to smooth over (a dropped connection, a momentary
// rate limit) without meaningfully slowing down the common case.
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class AiHttpError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

// Wraps a single provider call with the shared timeout/retry policy so
// callOpenRouter/callAnthropic below only need to describe their own
// request/response shape, not error-handling policy.
async function withResilience(label: string, attempt: (signal: AbortSignal) => Promise<Response>): Promise<Response> {
  let lastErr: unknown;
  for (let i = 1; i <= MAX_ATTEMPTS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await attempt(controller.signal);
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const err = new AiHttpError(`${label} API error ${res.status}: ${body.slice(0, 500)}`, res.status);
        if (i < MAX_ATTEMPTS && isRetryableStatus(res.status)) {
          lastErr = err;
          await sleep(RETRY_DELAY_MS);
          continue;
        }
        throw err;
      }
      return res;
    } catch (err: any) {
      clearTimeout(timer);
      const timedOut = err?.name === "AbortError";
      if (timedOut) {
        lastErr = new Error(`${label} request timed out after ${REQUEST_TIMEOUT_MS}ms.`);
      } else {
        lastErr = err;
      }
      // Timeouts and network errors (fetch throwing, not an HTTP status)
      // are retried the same as a 5xx; anything already thrown as
      // AiHttpError with a non-retryable status was re-thrown above and
      // never reaches here.
      if (i < MAX_ATTEMPTS) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      throw lastErr;
    } finally {
      clearTimeout(timer);
    }
  }
  // Unreachable given the loop above always returns or throws, but keeps
  // TypeScript satisfied that every path resolves or rejects.
  throw lastErr instanceof Error ? lastErr : new Error(`${label} request failed.`);
}

async function callOpenRouter(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const res = await withResilience("OpenRouter", (signal) =>
    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_KEY}`,
        // OpenRouter asks for these two so usage shows up attributed
        // correctly on your dashboard — harmless if inaccurate, but worth
        // setting OPENROUTER_SITE_URL to your real deployment URL.
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3100",
        "X-Title": "PulseID Analytics",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    })
  );

  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("OpenRouter API returned an empty or unexpected response shape.");
  }
  return text.trim();
}

async function callAnthropic(systemPrompt: string, userPrompt: string, maxTokens: number): Promise<string> {
  const res = await withResilience("Anthropic", (signal) =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY as string,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    })
  );

  const data = await res.json();
  const text = (data.content || [])
    .map((block: any) => (block.type === "text" ? block.text : ""))
    .filter(Boolean)
    .join("\n");
  if (!text.trim()) {
    throw new Error("Anthropic API returned an empty response.");
  }
  return text.trim();
}

export async function askClaude(systemPrompt: string, userPrompt: string, maxTokens = 1200): Promise<string> {
  if (PROVIDER === "openrouter") return callOpenRouter(systemPrompt, userPrompt, maxTokens);
  if (PROVIDER === "anthropic") return callAnthropic(systemPrompt, userPrompt, maxTokens);
  throw new Error(
    "No AI provider is configured for the analytics service — set OPENROUTER_API_KEY or ANTHROPIC_API_KEY to enable AI features."
  );
}

// Shared house style so every AI-written surface in this app sounds like
// the same careful analyst, not a chatbot.
export const ANALYST_SYSTEM_PROMPT = `You are a public-health data analyst writing for PulseID Analytics, a national aggregate-only surveillance dashboard.

Rules you always follow:
- You only ever see already-aggregated counts (by region, diagnosis, and time period) — never individual patient records. Never imply you have or could look up an individual's data.
- Counts below 5 are withheld and shown to you as suppressed — never guess or estimate a suppressed number, just note that it's small.
- Be precise and factual. Do not invent regions, conditions, or numbers that were not given to you in the data.
- Write in plain, direct English suitable for a health-ministry briefing — short sentences, no hype, no unnecessary hedging, no emoji.
- When you flag a trend or anomaly, say what the data shows and let the reader draw policy conclusions — you are not making resource-allocation or clinical decisions, only surfacing what the numbers say.`;
