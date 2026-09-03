import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getBulletinDb } from "@/lib/bulletin-db";

// Named analyst accounts, stored in this app's own SQLite file (same one
// bulletins live in — see lib/bulletin-db.ts). This replaces the original
// single-shared-password design: a real ministry-of-health deployment needs
// to know *which* analyst approved a bulletin or ran a query, not just that
// "the" password was typed correctly. Nothing in this table is patient
// data — it's the analytics app's own user directory, same trust boundary
// as everything else in this service.
//
// Two roles:
//   - "admin"  — everything a viewer can do, plus: approve/reject bulletins,
//                 manage other analyst accounts, read the audit log.
//   - "viewer" — read-only access to every dashboard page and the AI tools.
// Role checks are enforced server-side in each route handler, not just
// hidden in the UI — the same posture the main backend takes with
// requireDoctor.

let initialized = false;

function ensureSchema() {
  if (initialized) return;
  const db = getBulletinDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',   -- 'admin' | 'viewer'
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_login_at TEXT
    );
  `);
  initialized = true;
  bootstrapAdminIfEmpty();
}

// First-run convenience: if no analyst accounts exist yet, create one admin
// from ANALYTICS_ADMIN_EMAIL / ANALYTICS_ADMIN_PASSWORD so the app is usable
// on a fresh deployment without a manual DB insert. Every account created
// after that goes through the (admin-only) "Add analyst" flow instead.
function bootstrapAdminIfEmpty() {
  const db = getBulletinDb();
  const { count } = db.prepare(`SELECT COUNT(*) as count FROM analysts`).get() as { count: number };
  if (count > 0) return;

  const email = process.env.ANALYTICS_ADMIN_EMAIL;
  const password = process.env.ANALYTICS_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn(
      "[pulseid-analytics] No analyst accounts exist and ANALYTICS_ADMIN_EMAIL/ANALYTICS_ADMIN_PASSWORD are not set — nobody can log in. Set both env vars and restart."
    );
    return;
  }
  const hash = bcrypt.hashSync(password, 12);
  db.prepare(
    `INSERT INTO analysts (id, name, email, password_hash, role, active, created_at)
     VALUES (@id, @name, @email, @hash, 'admin', 1, @createdAt)`
  ).run({
    id: randomUUID(),
    name: "Administrator",
    email: email.toLowerCase().trim(),
    hash,
    createdAt: new Date().toISOString(),
  });
  console.log(`[pulseid-analytics] Bootstrapped initial admin account (${email}). Change its password after first login.`);
}

export type AnalystRole = "admin" | "viewer";

export type Analyst = {
  id: string;
  name: string;
  email: string;
  role: AnalystRole;
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
};

function rowToAnalyst(row: any): Analyst {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: !!row.active,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
  };
}

// Fixed dummy hash compared against on an unknown email, same trick the
// main backend uses (see backend/src/server.ts DUMMY_HASH) — bcrypt takes
// roughly the same time whether the email exists or not, so login timing
// can't be used to enumerate valid analyst accounts.
const DUMMY_HASH = bcrypt.hashSync("no-such-analyst", 12);

export function verifyAnalystLogin(email: string, password: string): Analyst | null {
  ensureSchema();
  const db = getBulletinDb();
  const row = db.prepare(`SELECT * FROM analysts WHERE email = ?`).get(email.toLowerCase().trim()) as any;
  const ok = bcrypt.compareSync(password, row?.password_hash || DUMMY_HASH);
  if (!ok || !row || !row.active) return null;
  db.prepare(`UPDATE analysts SET last_login_at = ? WHERE id = ?`).run(new Date().toISOString(), row.id);
  return rowToAnalyst({ ...row, last_login_at: new Date().toISOString() });
}

export function getAnalystByEmail(email: string): Analyst | null {
  ensureSchema();
  const row = getBulletinDb().prepare(`SELECT * FROM analysts WHERE email = ?`).get(email.toLowerCase().trim()) as any;
  return row ? rowToAnalyst(row) : null;
}

export function getAnalystById(id: string): Analyst | null {
  ensureSchema();
  const row = getBulletinDb().prepare(`SELECT * FROM analysts WHERE id = ?`).get(id) as any;
  return row ? rowToAnalyst(row) : null;
}

export function listAnalysts(): Analyst[] {
  ensureSchema();
  const rows = getBulletinDb().prepare(`SELECT * FROM analysts ORDER BY created_at ASC`).all() as any[];
  return rows.map(rowToAnalyst);
}

export function createAnalyst(input: { name: string; email: string; password: string; role: AnalystRole }): Analyst {
  ensureSchema();
  const db = getBulletinDb();
  const existing = getAnalystByEmail(input.email);
  if (existing) throw new Error("An analyst with that email already exists.");
  const hash = bcrypt.hashSync(input.password, 12);
  const id = randomUUID();
  db.prepare(
    `INSERT INTO analysts (id, name, email, password_hash, role, active, created_at)
     VALUES (@id, @name, @email, @hash, @role, 1, @createdAt)`
  ).run({
    id,
    name: input.name.trim(),
    email: input.email.toLowerCase().trim(),
    hash,
    role: input.role,
    createdAt: new Date().toISOString(),
  });
  return getAnalystById(id)!;
}

export function setAnalystActive(id: string, active: boolean): void {
  ensureSchema();
  getBulletinDb().prepare(`UPDATE analysts SET active = ? WHERE id = ?`).run(active ? 1 : 0, id);
}

export function changeAnalystPassword(id: string, newPassword: string): void {
  ensureSchema();
  const hash = bcrypt.hashSync(newPassword, 12);
  getBulletinDb().prepare(`UPDATE analysts SET password_hash = ? WHERE id = ?`).run(hash, id);
}

export function verifyPasswordForAnalyst(id: string, password: string): boolean {
  ensureSchema();
  const row = getBulletinDb().prepare(`SELECT password_hash FROM analysts WHERE id = ?`).get(id) as any;
  if (!row) return false;
  return bcrypt.compareSync(password, row.password_hash);
}
