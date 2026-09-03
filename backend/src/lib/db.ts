import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { provinceForCity } from "./provinces";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// Tests set PULSEID_DB_PATH to an isolated throwaway file so they never
// touch the real dev database in data/pulseid.db.
const DB_PATH = process.env.PULSEID_DB_PATH || path.join(DATA_DIR, "pulseid.db");

declare global {
  // eslint-disable-next-line no-var
  var __pulseidDb: Database.Database | undefined;
}

export function getDb(): Database.Database {
  if (!global.__pulseidDb) {
    const db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrateAppointmentsScheduledAtNullable(db);
    migrateHospitalsProvince(db);
    migrateDoctorsIsActive(db);
    migrateHospitalAdmins(db);
    migrateAuditLogsActorId(db);
    migrateAppointmentsRecurrenceAndReminders(db);
    migrateMedicalRecordVitals(db);
    migrateRiskAssessments(db);
    migrateFollowupAgents(db);
    migrateFollowupCheckins(db);
    global.__pulseidDb = db;
  }
  return global.__pulseidDb;
}

// Older databases were created before `province` existed on `hospitals`.
// SQLite supports adding a nullable column in place, so this is a simple
// ALTER TABLE rather than a full rebuild. Existing rows get NULL/`Unspecified`
// province until backfilled (see backfillHospitalProvinces in repo.ts).
function migrateHospitalsProvince(db: Database.Database): void {
  const tableExists = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'hospitals'`)
    .get();
  if (!tableExists) return;

  const columns = db.prepare(`PRAGMA table_info(hospitals)`).all() as { name: string }[];
  if (columns.some((c) => c.name === "province")) {
    return;
  }

  db.exec(`ALTER TABLE hospitals ADD COLUMN province TEXT;`);

  // Backfill from the known city -> province lookup so hospitals seeded
  // before this column existed don't all fall into "Unspecified".
  const hospitals = db.prepare(`SELECT id, city FROM hospitals`).all() as { id: string; city: string | null }[];
  const setProvince = db.prepare(`UPDATE hospitals SET province = ? WHERE id = ?`);
  const backfill = db.transaction(() => {
    for (const h of hospitals) {
      const province = provinceForCity(h.city);
      if (province) setProvince.run(province, h.id);
    }
  });
  backfill();
}

// Older databases predate the hospital-admin tier and never gave doctors an
// active/inactive flag (a hospital admin deactivating a doctor, rather than
// deleting them and orphaning their historical records, needs somewhere to
// store that). Nullable-safe ALTER, defaulting every existing doctor to
// active so this never silently locks out doctors who already had logins.
function migrateDoctorsIsActive(db: Database.Database): void {
  const tableExists = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'doctors'`)
    .get();
  if (!tableExists) return;

  const columns = db.prepare(`PRAGMA table_info(doctors)`).all() as { name: string }[];
  if (columns.some((c) => c.name === "is_active")) return;

  db.exec(`ALTER TABLE doctors ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`);
}

// Older databases predate the hospital-admin tier entirely. Creates the
// table if missing so a DB seeded before this feature existed still works
// once the app (and scripts/seed.js, run with --force or against a fresh
// DB) catches up — mirrors the CREATE TABLE IF NOT EXISTS blocks in
// scripts/seed.js so either entry point leaves the schema in the same shape.
function migrateHospitalAdmins(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS hospital_admins (
      id TEXT PRIMARY KEY,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      hospital_id TEXT NOT NULL REFERENCES hospitals(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_hospital_admins_hospital ON hospital_admins(hospital_id);
  `);
}

// Older databases logged the actor of an audit entry only as a free-text
// actor_name (e.g. "Dr. Ayesha Raza") — fine for display, but useless for
// reliably filtering "everything this specific doctor did" (names collide,
// and get out of sync if a doctor's profile is ever renamed). This adds a
// nullable actor_id so new entries can be tied to a stable doctor id (see
// getDoctorAuditLog in repo.ts); rows written before this migration simply
// keep actor_id NULL and won't appear in a per-doctor audit view, which is
// an acceptable gap for historical data.
function migrateAuditLogsActorId(db: Database.Database): void {
  const tableExists = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'audit_logs'`)
    .get();
  if (!tableExists) return;

  const columns = db.prepare(`PRAGMA table_info(audit_logs)`).all() as { name: string }[];
  if (columns.some((c) => c.name === "actor_id")) return;

  db.exec(`ALTER TABLE audit_logs ADD COLUMN actor_id TEXT;`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_role, actor_id, created_at DESC);`);
}

// Adds recurring-appointment and reminder-tracking columns to appointments,
// and creates the waitlist table — all additive/nullable, so no rebuild is
// needed (unlike migrateAppointmentsScheduledAtNullable above, which had to
// rebuild because it was *loosening* a NOT NULL constraint).
function migrateAppointmentsRecurrenceAndReminders(db: Database.Database): void {
  const tableExists = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'appointments'`)
    .get();
  if (tableExists) {
    const columns = db.prepare(`PRAGMA table_info(appointments)`).all() as { name: string }[];
    const names = new Set(columns.map((c) => c.name));
    if (!names.has("reminder_sent_at")) {
      db.exec(`ALTER TABLE appointments ADD COLUMN reminder_sent_at TEXT;`);
    }
    if (!names.has("recurrence_group_id")) {
      db.exec(`ALTER TABLE appointments ADD COLUMN recurrence_group_id TEXT;`);
    }
    if (!names.has("recurrence_rule")) {
      db.exec(`ALTER TABLE appointments ADD COLUMN recurrence_rule TEXT;`);
    }
    if (!names.has("recurrence_index")) {
      db.exec(`ALTER TABLE appointments ADD COLUMN recurrence_index INTEGER;`);
    }
    if (!names.has("recurrence_count")) {
      db.exec(`ALTER TABLE appointments ADD COLUMN recurrence_count INTEGER;`);
    }
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_appointments_reminder ON appointments(status, scheduled_at) WHERE reminder_sent_at IS NULL;`
    );
    db.exec(`CREATE INDEX IF NOT EXISTS idx_appointments_recurrence ON appointments(recurrence_group_id);`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS appointment_waitlist (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','offered','booked','cancelled')),
      offered_appointment_id TEXT REFERENCES appointments(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_waitlist_doctor ON appointment_waitlist(doctor_id, status, created_at ASC);
    CREATE INDEX IF NOT EXISTS idx_waitlist_patient ON appointment_waitlist(patient_id, status);
  `);
}
// patients picked their own date/time). Patients now only request a doctor
// — the date is set later by the doctor/clinic — so scheduled_at must be
// nullable. SQLite can't drop a NOT NULL constraint in place, so if we find
// the old shape we rebuild the table, keeping all existing rows/ids intact.
function migrateAppointmentsScheduledAtNullable(db: Database.Database): void {
  const tableExists = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'appointments'`)
    .get();
  if (!tableExists) return;

  const columns = db.prepare(`PRAGMA table_info(appointments)`).all() as { name: string; notnull: number }[];
  const scheduledAtCol = columns.find((c) => c.name === "scheduled_at");
  if (!scheduledAtCol || scheduledAtCol.notnull !== 1) return;

  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE appointments_new (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        scheduled_at TEXT,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','completed','cancelled')),
        doctor_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      INSERT INTO appointments_new SELECT * FROM appointments;
      DROP TABLE appointments;
      ALTER TABLE appointments_new RENAME TO appointments;
      CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id, scheduled_at DESC);
      CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id, scheduled_at ASC);
    `);
  });
  migrate();
}

// Adds vitals columns to medical_records so a visit can optionally capture
// the small set of numeric readings the rule-based risk scorer in
// lib/risk-scoring.ts needs (blood pressure, blood sugar, temperature,
// heart rate). All nullable/additive — a visit with no vitals recorded
// simply can't have a risk assessment computed for it (see
// computeRiskAssessment's caller in server.ts, which skips scoring when
// every vitals field is absent).
function migrateMedicalRecordVitals(db: Database.Database): void {
  const tableExists = db
    .prepare(`SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'medical_records'`)
    .get();
  if (!tableExists) return;

  const columns = db.prepare(`PRAGMA table_info(medical_records)`).all() as { name: string }[];
  const names = new Set(columns.map((c) => c.name));
  if (!names.has("systolic_bp")) db.exec(`ALTER TABLE medical_records ADD COLUMN systolic_bp INTEGER;`);
  if (!names.has("diastolic_bp")) db.exec(`ALTER TABLE medical_records ADD COLUMN diastolic_bp INTEGER;`);
  if (!names.has("blood_sugar_mmol")) db.exec(`ALTER TABLE medical_records ADD COLUMN blood_sugar_mmol REAL;`);
  if (!names.has("body_temp_c")) db.exec(`ALTER TABLE medical_records ADD COLUMN body_temp_c REAL;`);
  if (!names.has("heart_rate_bpm")) db.exec(`ALTER TABLE medical_records ADD COLUMN heart_rate_bpm INTEGER;`);
}

// Stores every risk assessment the rule-based scorer produces, one row per
// scoring run (usually triggered when a doctor adds a visit with vitals
// attached). Kept as a full history rather than a single "current risk"
// column on patients, so a doctor or the patient can see the trend over
// time, not just the latest snapshot.
function migrateRiskAssessments(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS risk_assessments (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      medical_record_id TEXT REFERENCES medical_records(id) ON DELETE SET NULL,
      context TEXT NOT NULL DEFAULT 'general' CHECK (context IN ('general','maternal')),
      risk_level TEXT NOT NULL CHECK (risk_level IN ('low','mid','high')),
      risk_score REAL NOT NULL,
      factors TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_risk_assessments_patient ON risk_assessments(patient_id, created_at DESC);
  `);
}

// A doctor-configured proactive follow-up: recurring check-in prompts sent
// to one patient (e.g. postpartum, post-operative, or chronic-disease
// monitoring) at a fixed cadence. `questions` is a JSON-encoded
// FollowupQuestion[] (see types.ts) chosen by the doctor at creation time
// (lib/followup-agent.ts ships sensible defaults per pathology). The sweep
// in lib/followup-agent.ts (run by scripts/followup-scheduler.ts) is what
// actually sends a check-in prompt once `next_checkin_at` is due.
function migrateFollowupAgents(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS followup_agents (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      doctor_id TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
      pathology TEXT NOT NULL,
      questions TEXT NOT NULL,
      frequency_days INTEGER NOT NULL DEFAULT 7,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
      last_checkin_at TEXT,
      next_checkin_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_followup_agents_doctor ON followup_agents(doctor_id, status);
    CREATE INDEX IF NOT EXISTS idx_followup_agents_patient ON followup_agents(patient_id, status);
    CREATE INDEX IF NOT EXISTS idx_followup_agents_due ON followup_agents(status, next_checkin_at);
  `);
}

// One row per check-in prompt actually sent by the sweep. 'pending' until
// the patient responds (or it's swept up as 'missed' — see
// listStaleFollowupCheckins in repo.ts), then 'completed' with the
// patient's answers, a rule-based risk_flag, and (when an AI provider is
// configured) a short doctor-facing summary. doctor_alerted_at is set once
// a doctor has acknowledged a 'concern'/'urgent' flag from the alerts list,
// so resolved alerts stop resurfacing.
function migrateFollowupCheckins(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS followup_checkins (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES followup_agents(id) ON DELETE CASCADE,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','missed')),
      responses TEXT,
      risk_flag TEXT CHECK (risk_flag IN ('ok','concern','urgent')),
      ai_summary TEXT,
      doctor_alerted_at TEXT,
      sent_at TEXT NOT NULL DEFAULT (datetime('now')),
      responded_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_followup_checkins_agent ON followup_checkins(agent_id, sent_at DESC);
    CREATE INDEX IF NOT EXISTS idx_followup_checkins_patient ON followup_checkins(patient_id, status);
    CREATE INDEX IF NOT EXISTS idx_followup_checkins_alerts ON followup_checkins(risk_flag, doctor_alerted_at);
  `);
}
