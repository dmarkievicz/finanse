"use client";

import type { MonthlyBudgetPoint } from "@/lib/dashboard/budget-metrics";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SectionCard, SectionCardHeader } from "@/components/layout";

interface MonthlyPerformanceChartProps {
  data: MonthlyBudgetPoint[];
  highlightMonth?: number | null;
  year: number;
}

export function MonthlyPerformanceChart({
  data,
  highlightMonth,
  year,
}: MonthlyPerformanceChartProps) {
  const withData = data.filter((d) => d.hasData);
  const maxAbs = Math.max(...data.map((d) => Math.abs(d.performance)), 1);

  return (
    <SectionCard>
      <SectionCardHeader
        title="Wynik miesięczny"
        subtitle={`Przychody − wydatki · ${year}`}
      />

      {withData.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Brak danych w tym roku</p>
      ) : (
        <div className="space-y-1">
          {data.map((d) => {
            if (!d.hasData && d.performance === 0) {
              return (
                <div
                  key={d.month}
                  className="flex items-center gap-3 px-1 py-1 text-[12px] text-slate-300"
                >
                  <span className="w-16 shrink-0">{d.shortLabel}</span>
                  <span className="flex-1">—</span>
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
                  "flex items-center gap-3 rounded-lg px-1 py-1",
                  isHighlight && "bg-slate-50"
                )}
              >
                <span className="w-16 shrink-0 text-[12px] text-slate-500">{d.shortLabel}</span>
                <div className="relative h-5 flex-1 overflow-hidden rounded bg-slate-100">
                  <div
                    className={cn(
                      "absolute top-0 h-full rounded transition-all",
                      positive ? "left-1/2 bg-emerald-500" : "right-1/2 bg-rose-500"
                    )}
                    style={{ width: `${pct / 2}%` }}
                  />
                  <div className="absolute left-1/2 top-0 h-full w-px bg-slate-300" />
                </div>
                <span
                  className={cn(
                    "w-20 shrink-0 text-right text-[12px] font-semibold tabular-nums",
                    positive ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {formatPln(d.performance)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
