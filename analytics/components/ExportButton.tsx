"use client";

// Thin link styled as a button — hitting /api/export?type=... directly lets
// the browser handle the download (Content-Disposition: attachment) without
// any client-side state. Kept as its own component just so every export
// button on the dashboard looks and behaves identically.
export function ExportButton({ type, label = "Export CSV" }: { type: "regions" | "provinces" | "conditions" | "quality"; label?: string }) {
  return (
    <a
      href={`/api/export?type=${type}`}
      className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-sage hover:border-teal hover:text-teal-dark transition-colors"
    >
      ⬇ {label}
    </a>
  );
}
