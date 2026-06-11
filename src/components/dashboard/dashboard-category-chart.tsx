import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CategorySlice } from "@/lib/queries/dashboard";
import { formatPln } from "@/lib/format";
import {
  DashboardEmpty,
  DashboardPanel,
  DashboardPanelHeader,
  dashboardLink,
} from "@/components/dashboard/dashboard-ui";

interface DashboardCategoryChartProps {
  categories: CategorySlice[];
  total: number;
  periodFrom: string;
  periodTo: string;
}

export function DashboardCategoryChart({
  categories,
  total,
  periodFrom,
  periodTo,
}: DashboardCategoryChartProps) {
  if (total === 0 || categories.length === 0) {
    return (
      <DashboardPanel>
        <DashboardPanelHeader title="Wydatki wg kategorii" subtitle="Top 5 w okresie" />
        <DashboardEmpty>Brak wydatków w tym okresie</DashboardEmpty>
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel>
      <DashboardPanelHeader
        title="Wydatki wg kategorii"
        subtitle={`Łącznie ${formatPln(total)}`}
        action={
          <Link
            href={`/transactions?type=expense&period=custom&from=${periodFrom}&to=${periodTo}`}
            className={`inline-flex items-center gap-1 ${dashboardLink}`}
          >
            Wszystkie
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="space-y-1">
        {categories.map((c) => (
          <Link
            key={c.name}
            href={
              c.categoryId
                ? `/transactions?type=expense&category=${c.categoryId}&period=custom&from=${periodFrom}&to=${periodTo}`
                : `/transactions?type=expense&period=custom&from=${periodFrom}&to=${periodTo}`
            }
            className="block rounded-lg px-2 py-2.5 transition hover:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: c.color }}
                />
                <span className="truncate text-[13px] font-medium text-slate-700">{c.name}</span>
              </span>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums text-slate-800">
                {formatPln(c.total)}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 pl-4">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full opacity-80"
                  style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                />
              </div>
              <span className="w-9 text-right text-[11px] tabular-nums text-slate-400">
                {c.pct}%
              </span>
              {c.trendPct != null && (
                <span
                  className={`text-[11px] tabular-nums ${
                    c.trendPct <= 0 ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {c.trendPct > 0 ? "+" : ""}
                  {c.trendPct}%
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </DashboardPanel>
  );
}
