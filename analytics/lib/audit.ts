import { randomUUID } from "crypto";
import { getBulletinDb } from "@/lib/bulletin-db";

// Access-transparency log for the analytics app itself — mirrors why the
// main backend logs every read of a patient record (see backend's
// lib/repo.ts logAudit), just for a different kind of sensitive action:
// who signed in, who approved/rejected a bulletin, who ran an AI query,
// who exported data, who managed analyst accounts. Nothing logged here is
// patient data — only analyst identity + the action they took.

let initialized = false;

function ensureSchema() {
  if (initialized) return;
  const db = getBulletinDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS analyst_audit_log (
      id TEXT PRIMARY KEY,
      analyst_email TEXT,
      analyst_name TEXT,
      action TEXT NOT NULL,
      detail TEXT,
      ip TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON analyst_audit_log(created_at DESC);
  `);
  initialized = true;
}

export type AuditAction =
  | "login"
  | "login_failed"
  | "logout"
  | "bulletin_approved"
  | "bulletin_rejected"
  | "bulletin_generated"
  | "ai_query"
  | "export_csv"
  | "analyst_created"
  | "analyst_deactivated"
  | "password_changed";

export type AuditEntry = {
  id: string;
  analystEmail: string | null;
  analystName: string | null;
  action: AuditAction;
  detail: string | null;
  ip: string | null;
  createdAt: string;
};

function rowToEntry(row: any): AuditEntry {
  return {
    id: row.id,
    analystEmail: row.analyst_email,
    analystName: row.analyst_name,
    action: row.action,
    detail: row.detail,
    ip: row.ip,
    createdAt: row.created_at,
  };
}

export function logAnalystAction(input: {
  analystEmail?: string | null;
  analystName?: string | null;
  action: AuditAction;
  detail?: string | null;
  ip?: string | null;
}): void {
  ensureSchema();
  getBulletinDb()
    .prepare(
      `INSERT INTO analyst_audit_log (id, analyst_email, analyst_name, action, detail, ip, created_at)
       VALUES (@id, @analystEmail, @analystName, @action, @detail, @ip, @createdAt)`
    )
    .run({
      id: randomUUID(),
      analystEmail: input.analystEmail ?? null,
      analystName: input.analystName ?? null,
      action: input.action,
      detail: input.detail ?? null,
      ip: input.ip ?? null,
      createdAt: new Date().toISOString(),
    });
}

export function listAuditLog(limit = 100): AuditEntry[] {
  ensureSchema();
  const rows = getBulletinDb()
    .prepare(`SELECT * FROM analyst_audit_log ORDER BY created_at DESC LIMIT ?`)
    .all(Math.min(Math.max(limit, 1), 500)) as any[];
  return rows.map(rowToEntry);
}
