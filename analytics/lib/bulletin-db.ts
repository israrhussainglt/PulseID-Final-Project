import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// The analytics app's *own* tiny database — completely separate from the
// backend's patient-record SQLite file. It stores bulletins (AI-written
// narrative text, a snapshot of the chart data it was written from, and a
// review status), plus this app's own analyst accounts and audit log (see
// lib/analysts.ts and lib/audit.ts, which share this same connection).
// Nothing in here is patient data.

const DATA_DIR = process.env.ANALYTICS_DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, "analytics.db");

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS bulletins (
      id TEXT PRIMARY KEY,
      period TEXT NOT NULL,              -- 'weekly' | 'monthly'
      period_label TEXT NOT NULL,        -- e.g. "Week of 2026-08-10" / "August 2026"
      narrative_md TEXT NOT NULL,
      chart_data TEXT NOT NULL,          -- JSON snapshot used to render the report's graphs
      status TEXT NOT NULL DEFAULT 'pending_review',  -- pending_review | approved | rejected
      generated_at TEXT NOT NULL,
      generated_by TEXT NOT NULL,        -- 'scheduler' | 'manual'
      reviewed_at TEXT,
      reviewer_note TEXT,
      reviewed_by TEXT                   -- analyst email; added alongside per-analyst accounts
    );
    CREATE INDEX IF NOT EXISTS idx_bulletins_generated_at ON bulletins(generated_at DESC);
  `);
  ensureReviewedByColumn(db);
  return db;
}

// reviewed_by was added after the original schema shipped — existing
// deployments upgrading in place need it added in-place rather than losing
// their bulletin history, the same migration posture backend/src/lib/db.ts
// takes for the main database.
function ensureReviewedByColumn(database: Database.Database) {
  const cols = database.prepare(`PRAGMA table_info(bulletins)`).all() as Array<{ name: string }>;
  if (!cols.some((c) => c.name === "reviewed_by")) {
    database.exec(`ALTER TABLE bulletins ADD COLUMN reviewed_by TEXT`);
  }
}

// Exposed so lib/analysts.ts and lib/audit.ts can add their own tables to
// this same SQLite file/connection instead of opening a second one.
export function getBulletinDb(): Database.Database {
  return getDb();
}

export type BulletinStatus = "pending_review" | "approved" | "rejected";
export type BulletinPeriod = "weekly" | "monthly";

export type Bulletin = {
  id: string;
  period: BulletinPeriod;
  periodLabel: string;
  narrativeMd: string;
  chartData: unknown;
  status: BulletinStatus;
  generatedAt: string;
  generatedBy: "scheduler" | "manual";
  reviewedAt: string | null;
  reviewerNote: string | null;
  reviewedBy: string | null;
};

function rowToBulletin(row: any): Bulletin {
  return {
    id: row.id,
    period: row.period,
    periodLabel: row.period_label,
    narrativeMd: row.narrative_md,
    chartData: JSON.parse(row.chart_data),
    status: row.status,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by,
    reviewedAt: row.reviewed_at,
    reviewerNote: row.reviewer_note,
    reviewedBy: row.reviewed_by ?? null,
  };
}

export function insertBulletin(input: {
  id: string;
  period: BulletinPeriod;
  periodLabel: string;
  narrativeMd: string;
  chartData: unknown;
  generatedBy: "scheduler" | "manual";
}): Bulletin {
  const database = getDb();
  const generatedAt = new Date().toISOString();
  database
    .prepare(
      `INSERT INTO bulletins (id, period, period_label, narrative_md, chart_data, status, generated_at, generated_by)
       VALUES (@id, @period, @periodLabel, @narrativeMd, @chartData, 'pending_review', @generatedAt, @generatedBy)`
    )
    .run({
      id: input.id,
      period: input.period,
      periodLabel: input.periodLabel,
      narrativeMd: input.narrativeMd,
      chartData: JSON.stringify(input.chartData),
      generatedAt,
      generatedBy: input.generatedBy,
    });
  return getBulletin(input.id)!;
}

export function listBulletins(limit = 30): Bulletin[] {
  const rows = getDb().prepare(`SELECT * FROM bulletins ORDER BY generated_at DESC LIMIT ?`).all(limit) as any[];
  return rows.map(rowToBulletin);
}

export function getBulletin(id: string): Bulletin | null {
  const row = getDb().prepare(`SELECT * FROM bulletins WHERE id = ?`).get(id) as any;
  return row ? rowToBulletin(row) : null;
}

export function reviewBulletin(
  id: string,
  status: "approved" | "rejected",
  note: string | undefined,
  reviewedBy: string
): Bulletin | null {
  const database = getDb();
  database
    .prepare(`UPDATE bulletins SET status = ?, reviewed_at = ?, reviewer_note = ?, reviewed_by = ? WHERE id = ?`)
    .run(status, new Date().toISOString(), note ?? null, reviewedBy, id);
  return getBulletin(id);
}
