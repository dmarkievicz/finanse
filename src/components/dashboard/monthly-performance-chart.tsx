"use client";

import type { MonthlyBudgetPoint } from "@/lib/dashboard/budget-metrics";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MonthlyPerformanceChartProps {
  data: MonthlyBudgetPoint[];
  highlightMonth?: number | null;
  year: number;
  embedded?: boolean;
}

export function MonthlyPerformanceChart({
  data,
  highlightMonth,
  year,
  embedded = false,
}: MonthlyPerformanceChartProps) {
  const withData = data.filter((d) => d.hasData);
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.performance)), 1);

  const body =
    withData.length === 0 ? (
      <p className="py-8 text-center text-sm text-muted">Brak danych w tym roku</p>
    ) : (
      <div className="space-y-1.5">
          {data.map((d) => {
            if (!d.hasData && d.performance === 0) {
              return (
                <div
                  key={d.month}
                  className="grid grid-cols-[3rem_1fr_5rem] items-center gap-2 px-1 py-1 text-xs text-slate-300"
                >
                  <span>{d.shortLabel}</span>
                  <span>—</span>
                  <span className="text-right">—</span>
                </div>
              );
            }

            const pct = (Math.abs(d.performance) / maxAbs) * 100;
            const positive = d.performance >= 0;
            const isHighlight = highlightMonth === d.month;

            return (
              <div
                key={d.month}
                className={cn(
                  "grid grid-cols-[3rem_1fr_5rem] items-center gap-2 rounded-md px-1 py-1.5",
                  isHighlight && "bg-slate-50 ring-1 ring-slate-200/80"
                )}
              >
                <span className="text-xs font-medium text-muted">{d.shortLabel}</span>
                <div className="relative h-6 overflow-hidden rounded-md bg-slate-100">
                  <div className="absolute left-1/2 top-0 h-full w-px bg-slate-300/80" />
                  <div
                    className={cn(
                      "absolute top-0 h-full rounded-sm transition-all",
                      positive
                        ? "left-1/2 bg-emerald-500/90"
                        : "right-1/2 bg-rose-500/90"
                    )}
                    style={{ width: `${Math.max(pct / 2, d.performance !== 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span
                  className={cn(
                    "text-right text-xs font-semibold tabular-nums",
                    positive ? "text-emerald-700" : "text-rose-600"
                  )}
                >
                  {formatPln(d.performance)}
                </span>
              </div>
            );
          })}
      </div>
    );

  if (embedded) {
    return body;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Wynik miesięczny</h3>
        <p className="mt-0.5 text-xs text-muted">Przychody − wydatki · {year}</p>
      </div>
      {body}
    </div>
  );
}
