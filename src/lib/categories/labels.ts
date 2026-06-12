import type { CategoryType } from "@/types/database";

export function categoryTypeLabel(type: CategoryType): string {
  switch (type) {
    case "expense":
      return "Wydatek";
    case "income":
      return "Przychód";
    case "both":
      return "Wydatki i przychody";
    default:
      return type;
  }
}

export function categoryTypeBadgeClass(type: CategoryType): string {
  switch (type) {
    case "expense":
      return "bg-rose-50 text-rose-700 ring-rose-200/80";
    case "income":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200/80";
    case "both":
      return "bg-slate-100 text-slate-700 ring-slate-200/80";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200/80";
  }
}

export function trendClass(delta: number | null): string {
  if (delta == null || delta === 0) return "text-slate-500";
  return delta > 0 ? "text-rose-600" : "text-emerald-600";
}

export function trendLabel(delta: number | null, deltaPct: number | null): string {
  if (delta == null) return "—";
  const sign = delta > 0 ? "+" : "";
  const pct =
    deltaPct != null && Number.isFinite(deltaPct)
      ? ` (${sign}${deltaPct.toFixed(0)}%)`
      : "";
  return `${sign}${Math.round(delta)} zł${pct}`;
}
