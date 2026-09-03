import type { SuppressibleCount } from "@/lib/api";

export function SuppressedValue({ value, className = "" }: { value: SuppressibleCount; className?: string }) {
  if (value.suppressed) {
    return <span className={`text-sage italic ${className}`}>&lt;5</span>;
  }
  return <span className={className}>{value.count?.toLocaleString()}</span>;
}
