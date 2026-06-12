import Link from "next/link";
import {
  TrendingDown,
  TrendingUp,
  Layers,
  AlertTriangle,
  FolderOpen,
  Target,
} from "lucide-react";
import type { CategoriesKpis } from "@/lib/queries/category-analytics";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CategoriesKpiGridProps {
  kpis: CategoriesKpis;
  periodLabel: string;
}

export function CategoriesKpiGrid({ kpis, periodLabel }: CategoriesKpiGridProps) {
  const items = [
    {
      label: "Wydatki",
      value: formatPln(kpis.expenseTotal),
      sub: periodLabel,
      icon: TrendingDown,
      accent: "border-l-rose-300",
      href: "/categories?tab=expense",
    },
    {
      label: "Przychody",
      value: formatPln(kpis.incomeTotal),
      sub: periodLabel,
      icon: TrendingUp,
      accent: "border-l-emerald-300",
      href: "/categories?tab=income",
    },
    {
      label: "Największa kategoria",
      value: kpis.topExpenseName ?? "—",
      sub: kpis.topExpenseAmount > 0 ? formatPln(kpis.topExpenseAmount) : "Brak wydatków",
      icon: Target,
      accent: "border-l-violet-300",
    },
    {
      label: "Aktywne kategorie",
      value: String(kpis.activeCount),
      sub: "Z transakcjami w okresie",
      icon: Layers,
      accent: "border-l-sky-300",
    },
    {
      label: "Bez transakcji",
      value: String(kpis.emptyCount),
      sub: "Ukryte domyślnie",
      icon: FolderOpen,
      accent: "border-l-slate-300",
      href: "/categories?showEmpty=1",
    },
    {
      label: "Przekroczony budżet",
      value: String(kpis.overBudgetCount),
      sub:
        kpis.uncategorizedExpenseCount > 0
          ? `${kpis.uncategorizedExpenseCount} bez kategorii (wyd.)`
          : "W okresie",
      icon: AlertTriangle,
      accent: "border-l-amber-300",
      href: "/categories?tab=budgeted",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const Icon = item.icon;
        const inner = (
          <div
            className={cn(
              "rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm border-l-[3px]",
              item.accent,
              item.href && "transition hover:border-slate-300 hover:shadow"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {item.label}
              </p>
              <Icon className="h-4 w-4 shrink-0 text-slate-300" />
            </div>
            <p className="mt-2 truncate text-lg font-semibold text-slate-900">{item.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{item.sub}</p>
          </div>
        );
        return item.href ? (
          <Link key={item.label} href={item.href}>
            {inner}
          </Link>
        ) : (
          <div key={item.label}>{inner}</div>
        );
      })}
    </div>
  );
}
