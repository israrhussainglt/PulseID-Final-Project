// A small, standalone process — run separately from the Next.js web
// server (`npm run scheduler`, or its own container/systemd timer/host
// cron) — that generates bulletins on a schedule and drops them into the
// review queue. It shares lib/bulletin-generator.ts with the manual
// "Generate now" button, so a scheduled bulletin is produced by exactly
// the same code path, just triggered by a clock instead of a click.
//
// Nothing this script generates is ever auto-published: every bulletin it
// writes lands with status pending_review, same as a manually generated
// one, and only leaves that state when an analyst approves or rejects it
// from the dashboard.
// Next.js auto-loads .env.local; a standalone script doesn't, so load it
// explicitly here (falls back to .env if .env.local isn't present).
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
const envLocal = path.join(__dirname, "..", ".env.local");
const envFallback = path.join(__dirname, "..", ".env");
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
else if (fs.existsSync(envFallback)) dotenv.config({ path: envFallback });

import cron from "node-cron";
import { generateBulletin } from "../lib/bulletin-generator";

const WEEKLY_CRON = process.env.BULLETIN_WEEKLY_CRON || "0 6 * * 1"; // Mondays 06:00
const MONTHLY_CRON = process.env.BULLETIN_MONTHLY_CRON || "0 6 1 * *"; // 1st of month, 06:00

async function runWeekly() {
  console.log(`[scheduler] Generating weekly bulletin at ${new Date().toISOString()}...`);
  try {
    const bulletin = await generateBulletin("weekly", "scheduler");
    console.log(`[scheduler] Weekly bulletin ${bulletin.id} generated, awaiting analyst review.`);
  } catch (err) {
    console.error("[scheduler] Failed to generate weekly bulletin:", err);
  }
}

async function runMonthly() {
  console.log(`[scheduler] Generating monthly bulletin at ${new Date().toISOString()}...`);
  try {
    const bulletin = await generateBulletin("monthly", "scheduler");
    console.log(`[scheduler] Monthly bulletin ${bulletin.id} generated, awaiting analyst review.`);
  } catch (err) {
    console.error("[scheduler] Failed to generate monthly bulletin:", err);
  }
}

console.log(`[scheduler] PulseID Analytics bulletin scheduler starting.`);
console.log(`[scheduler] Weekly:  "${WEEKLY_CRON}"`);
console.log(`[scheduler] Monthly: "${MONTHLY_CRON}"`);

cron.schedule(WEEKLY_CRON, runWeekly);
cron.schedule(MONTHLY_CRON, runMonthly);

if (process.argv.includes("--run-now")) {
  // Handy for testing: `npm run scheduler -- --run-now` fires a weekly
  // bulletin immediately instead of waiting for Monday.
  runWeekly();
}

console.log("[scheduler] Waiting for next scheduled run. Press Ctrl+C to stop.");
