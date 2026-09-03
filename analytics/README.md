# PulseID Analytics

The national/regional public-health dashboard: aggregate visit and diagnosis
counts across every hospital on PulseID, grouped by region and time. This is
a separate, independently deployable app from `frontend/` and `backend/` —
its own login, its own session, its own service.

**It never touches patient records.** It talks to `backend`'s
`/api/analytics/*` routes only, which return counts (region × diagnosis ×
time), nothing with a name or National ID attached, and suppress any count
under 5 as `<5` so a rare condition in a small region can't be used to
re-identify one person.

## Trust boundary

```
analytics (this app)  --x-analytics-key-->  backend  --SQL-->  the one database
      ^ analyst session (its own secret)          ^ every route here is aggregate-only
```

- `ANALYTICS_SERVICE_KEY` is a shared secret between this app and the
  backend — service-to-service auth, not a user login. It's only ever read
  server-side, so it can't end up in the browser bundle.
- `ANALYTICS_SESSION_SECRET` signs this app's own analyst session cookie.
  `ANALYTICS_ADMIN_EMAIL` / `ANALYTICS_ADMIN_PASSWORD` bootstrap exactly one
  admin account the very first time the app runs (only used if no analyst
  accounts exist yet in `analytics.db`). From then on, analysts sign in
  with their own email + password, set up from the admin-only **Analysts**
  page — see "Analyst accounts & roles" below.

## Analyst accounts & roles

Every analyst gets a named account (full name + email + password, bcrypt
hashed) instead of typing one shared password — this is what lets the audit
log say *who* approved a bulletin or ran a query, not just that "an
analyst" did. Two roles:

- **Viewer** — every dashboard page, plus the AI tools (Ask, Alerts
  briefing, Resources). Read-only otherwise.
- **Admin** — everything a viewer can do, plus: approve/reject bulletins,
  add or deactivate analyst accounts (**Analysts** page), and read the
  **Audit log**.

Role checks happen in the route handler itself (`lib/session.ts`
`requireAdmin()`), the same posture the main backend takes with
`requireDoctor` — a viewer calling an admin-only API route gets a 403 even
if they somehow reach the page. `middleware.ts` also redirects a viewer away
from `/dashboard/analysts` and `/dashboard/audit` as a UX nicety, not the
actual enforcement.

Deactivating an account (rather than deleting it) keeps that analyst's name
attached to their past bulletin reviews and audit-log entries instead of
orphaning that history — they just can no longer sign in.

Every analyst can change their own password from **Account settings**
(bottom of the nav, under their name) — including the bootstrapped admin,
who should rotate the `ANALYTICS_ADMIN_PASSWORD` value there after first
login.

## Audit log

Admin-only page logging every sign-in (successful or failed), sign-out,
bulletin approval/rejection/generation, AI query, CSV export, and
account/password change — who, what, when, and the requesting IP. This is
not patient data; it's a record of what analysts did with the aggregate
dashboard, the same access-transparency idea the patient portal gives
patients over their own record on the main backend.

## Exporting data

Regions, Overview (conditions), and Data quality each have an **Export
CSV** button (`/api/export?type=regions|conditions|quality`) for pasting
into a spreadsheet or a ministry report. Values use the same `<5
(suppressed)` convention shown on-screen, and fields are neutralized against
formula injection (a leading `'` on anything starting with `=`, `+`, `-`,
`@`, a tab, or a carriage return) the same way the doctor portal's patient
export does, so a diagnosis name can never execute as a spreadsheet formula.

## What's inside

The dashboard is organized as tabs across the top nav:

- **Overview** — national KPIs, busiest regions, most common conditions,
  and a badge linking to active alerts if any are firing.
- **Regions** — one row per hospital city: visit volume, distinct patients
  seen, top condition, and a link into that region's Benchmark view.
- **Map** — a Leaflet map with circles sized/colored by regional visit
  volume, tooltips showing counts and top condition per region.
- **Trends** — pick a condition (and optionally a region), see case counts
  over time with a toggleable dashed forecast line — a simple linear
  projection over the historical weekly/monthly points, clearly labeled as
  a rough projection, not a clinical forecast.
- **Benchmark** — for one region, how its share of visits for each top
  nationwide condition compares to that condition's share nationwide.
  Rows well above the national share are highlighted.
- **Alerts** — regions/conditions whose most recent week is at least ~1.8x
  their own recent baseline, computed with a simple, explainable ratio
  (`backend/src/lib/repo.ts`'s `getOutbreakAlerts`) rather than a
  black-box model.
- **Ask** — a natural-language query box. Answers are generated strictly
  from the same aggregate JSON every other page already shows — the AI
  never has, and can never gain, a path to an individual patient record.
- **Bulletins** — the scheduled weekly/monthly epidemiological bulletin,
  covered in its own section below since it's the flagship feature.
- **Resources** — cross-references visit load, active alerts, and
  reporting-gap flags into a short list of things worth a human's
  attention. Explicitly phrased as suggestions to evaluate, never as
  decisions already made.
- **Data quality** — flags regions whose reported visit volume dropped or
  rose sharply week over week, usually a sign a hospital's reporting
  pipeline broke (or a duplicate-submission bug), not that disease
  actually vanished or surged that fast.

## Bulletins — the scheduled weekly/monthly report

This is the flagship feature: a scheduled job that turns the week's (or
month's) region/condition rollups into a plain-English bulletin with
charts, with an AI drafting the narrative — and a human analyst reviewing
it before it goes anywhere.

**How it's generated.** `lib/bulletin-generator.ts` gathers real numbers
first (national visit trend, top conditions, region visit volume, and
outbreak alerts with a precomputed `pctChangeVsBaseline`), then hands that
JSON to the model with instructions to write a headline like *"Dengue
cases rose 34% in Karachi this week, concentrated in three hospitals"* —
but the model is only ever narrating a percentage that was already
computed in `lib/repo.ts`; it never invents or calculates one itself. That
same JSON snapshot is stored alongside the narrative as `chartData`, which
is what renders the four charts (national trend line, busiest-regions bar,
top-conditions bar, alert-magnitude bar) on the bulletin's detail view.

**How it's scheduled.** `scripts/scheduler.ts` is a small standalone
process — run it with `npm run scheduler`, or as its own container (see
`Dockerfile.scheduler` and the `analytics-scheduler` service in the root
`docker-compose.yml`) — that fires on a cron schedule (`BULLETIN_WEEKLY_CRON`
/ `BULLETIN_MONTHLY_CRON`, default Mondays 06:00 and the 1st of the month
06:00) and calls the exact same generator function the manual "Generate
weekly/monthly now" buttons on the Bulletins page use. A scheduled
bulletin and a manually triggered one are produced by identical code —
only `generatedBy` ("scheduler" vs "manual") differs.

**The review step.** Every bulletin — scheduled or manual — lands with
status `pending_review`. It stays there, visible in the review queue with
its charts and narrative, until an **admin** analyst clicks **Approve** or
**Reject** on the Bulletins page (`POST /api/bulletins/:id/review`,
admin-only — a viewer account can read every bulletin but can't sign off on
one). Nothing in this app auto-publishes or auto-sends a bulletin
anywhere; "approved" means "an admin signed off," and distributing it from
there (download the Markdown, print to PDF, paste into an email) is a
manual, deliberate next step.

**Storage.** Bulletins live in their own tiny SQLite database
(`lib/bulletin-db.ts`, defaults to `analytics/data/analytics.db`, or
`ANALYTICS_DATA_DIR` if set) — completely separate from the backend's
patient-record database. It only ever stores generated narrative text, a
JSON chart-data snapshot, and a review status: no patient data touches
this file at any point.

### The AI features specifically

Ask, the Alerts briefing, Bulletins, and Resources all go through
`analytics/lib/ai.ts`, which supports two interchangeable providers:

- **OpenRouter** (`OPENROUTER_API_KEY`) — used automatically if set, gives
  you a choice of many underlying models through one key/bill. Set
  `OPENROUTER_MODEL` to whichever model you want (default
  `anthropic/claude-sonnet-4.5`) — check current names/pricing at
  https://openrouter.ai/models.
- **Anthropic direct** (`ANTHROPIC_API_KEY`) — used if OpenRouter isn't
  configured. Set `ANTHROPIC_MODEL` to override the default.

Every one of the four AI features is a **writer over data that was
already computed elsewhere** — the model never sees a patient record,
never generates a number itself (all counts/ratios/forecasts come from
`backend/src/lib/repo.ts`), and if neither provider is configured, each of
those four pages still renders normally with a clear "not configured"
message where the AI content would go, rather than failing the page.

Reliability: every provider call goes through a shared timeout/retry
wrapper in `lib/ai.ts` — a 25s timeout (`AI_REQUEST_TIMEOUT_MS` to
override) so a hung upstream connection can't hang the request
indefinitely, and one automatic retry with a short backoff, but only for
transient failures (network errors, timeouts, HTTP 429/5xx). A 4xx from
the provider (bad key, malformed request) fails immediately instead of
retrying, since retrying it would just fail the same way again. Either
way, each of the four routes already catches the error and returns a
plain-language `error` field instead of a stack trace, so a flaky AI
provider degrades that one panel, not the page.

## Running it locally

You need the backend running first (see the root README), with
`ANALYTICS_SERVICE_KEY` set in `backend/.env`.

```bash
cd analytics
cp .env.example .env.local   # set ANALYTICS_SERVICE_KEY to match the backend,
                              # ANALYTICS_ADMIN_EMAIL/ANALYTICS_ADMIN_PASSWORD to
                              # bootstrap your first (admin) login, and
                              # OPENROUTER_API_KEY (or ANTHROPIC_API_KEY) if
                              # you want the AI features live
npm install
npm run dev                  # starts on :3100
```

Open **http://localhost:3100** and sign in with `ANALYTICS_ADMIN_EMAIL` /
`ANALYTICS_ADMIN_PASSWORD` (the login form pre-fills the default demo values
— `admin@health.gov` / `change-this-password` — so you can just hit Sign in
for local testing). Add named accounts for other analysts from the
**Analysts** page once you're in (see "Analyst accounts & roles" above).
Without an AI provider key set, everything still works except the four
AI-powered pages (Ask, Alerts briefing, Bulletins, Resources) show a "not
configured" message instead of generated text.

> `.env.local` is only read once, at process startup — if you change
> `ANALYTICS_SERVICE_KEY` or `ANALYTICS_ADMIN_PASSWORD` while `npm run dev`
> is already running, restart it. And since the admin account only
> auto-bootstraps when no analyst accounts exist yet, changing
> `ANALYTICS_ADMIN_PASSWORD` after the app has already run once won't do
> anything on its own — delete `analytics/data/` first so it re-bootstraps
> with the new password.

To also run the scheduled-bulletin job locally, in a second terminal:

```bash
cd analytics
npm run scheduler            # runs on its own cron schedule (Mon 6am weekly,
                              # 1st-of-month 6am monthly, by default)
# or, to fire one immediately instead of waiting for the schedule:
npm run scheduler -- --run-now
```

## Deploying it for real

Same shape as `frontend/`: `npm run build && npm run start`, or the included
`Dockerfile`. Set `API_INTERNAL_URL` to the backend's URL reachable from this
app's server, and make sure `ANALYTICS_SERVICE_KEY` matches the backend
exactly. This app never needs to be on the same domain as `frontend/` — it
has no shared cookie with it.

For the scheduled bulletins to keep running, deploy `Dockerfile.scheduler`
as its own long-lived process too (the root `docker-compose.yml` already
does this as the `analytics-scheduler` service) — it needs the same
`ANALYTICS_SERVICE_KEY` and AI provider key as the main app, plus a
persistent volume at `ANALYTICS_DATA_DIR` (`/app/data` in the Docker
images) mounted to the **same** volume the main `analytics` service uses,
so bulletins the scheduler writes show up in the dashboard's review queue.
