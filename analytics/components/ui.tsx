import { ReactNode } from "react";

// Copied to match frontend/components/ui.tsx exactly — same building
// blocks, same visual language, just used for analyst-facing pages here.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/70 ${className}`} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-line shadow-card ${className}`}>{children}</div>;
}

export function Eyebrow({ children, tone = "sage" }: { children: ReactNode; tone?: "sage" | "teal" | "alert" }) {
  const color = tone === "teal" ? "text-teal" : tone === "alert" ? "text-alert" : "text-sage";
  return <div className={`eyebrow ${color}`}>{children}</div>;
}

export function Badge({ children, tone = "teal" }: { children: ReactNode; tone?: "teal" | "alert" | "sage" | "amber" }) {
  const styles =
    tone === "alert"
      ? "bg-alert-light text-alert"
      : tone === "amber"
      ? "bg-amber-light text-amber"
      : tone === "sage"
      ? "bg-line text-sage"
      : "bg-teal-light text-teal-dark";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
  disabled,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "alert";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const base =
    "focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-ink text-white hover:bg-teal-dark",
    secondary: "bg-white text-ink border border-line hover:border-teal hover:text-teal-dark",
    ghost: "text-sage hover:text-ink hover:bg-line/60",
    alert: "bg-alert text-white hover:bg-alert/90",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-sage mt-1.5">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "focus-ring w-full rounded-lg border border-line bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-sage/70 focus:border-teal";

export const selectClass = inputClass + " appearance-none";
