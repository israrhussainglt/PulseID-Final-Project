// Shared CSV helpers for the analytics app's export routes. Mirrors
// backend/src/server.ts's /api/patients/export.csv neutralization exactly
// (same regex, same quoting) — any field that could be read as a formula
// by Excel/Sheets (starts with =, +, -, @, a tab, or a carriage return)
// gets a leading apostrophe so it always opens as plain text.
export function escapeCsvField(raw: string): string {
  const v = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${v.replace(/"/g, '""')}"`;
}

export function toCsv(header: string[], rows: Array<Array<string | number | null>>): string {
  const lines = [header.map(escapeCsvField).join(",")];
  for (const row of rows) {
    lines.push(row.map((v) => escapeCsvField(v === null || v === undefined ? "" : String(v))).join(","));
  }
  return lines.join("\r\n");
}

export function csvResponseHeaders(filenameBase: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filenameBase}-${new Date().toISOString().slice(0, 10)}.csv"`,
  };
}
