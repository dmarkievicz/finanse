"use client";

import { useState } from "react";
import type { MonthlyBudgetPoint } from "@/lib/dashboard/budget-metrics";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface TrackedVsBudgetChartProps {
  data: MonthlyBudgetPoint[];
  highlightMonth?: number | null;
  year: number;
}

const COLORS = {
  incomeTracked: "#059669",
  incomeBudget: "#a7f3d0",
  expenseTracked: "#e11d48",
  expenseBudget: "#fecdd3",
};

export function TrackedVsBudgetChart({ data, highlightMonth, year }: TrackedVsBudgetChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const withData = data.filter((d) => d.hasData || d.incomeBudget > 0 || d.expenseBudget > 0);
  const max = Math.max(
    ...data.flatMap((d) => [d.incomeTracked, d.expenseTracked, d.incomeBudget, d.expenseBudget]),
    1
  );

  const w = 400;
  const h = 168;
  const pad = { top: 16, right: 8, bottom: 32, left: 8 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const groupW = innerW / 12;
  const barW = groupW * 0.16;

  const hovered = hover != null ? data[hover] : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Wykonanie vs budżet</h3>
        <p className="mt-0.5 text-xs text-muted">Miesiące {year}</p>
      </div>

      {withData.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Brak danych w tym roku</p>
      ) : (
        <>
          <div className="mb-2 min-h-[2rem]">
            {hovered ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-md bg-slate-50 px-3 py-2 text-[11px]">
                <span className="font-medium text-slate-800">{hovered.label}</span>
                <span className="text-emerald-700">
                  Przychody {formatPln(hovered.incomeTracked)}
                  <span className="text-muted"> / {formatPln(hovered.incomeBudget)}</span>
                </span>
                <span className="text-rose-600">
                  Wydatki {formatPln(hovered.expenseTracked)}
                  <span className="text-muted"> / {formatPln(hovered.expenseBudget)}</span>
                </span>
              </div>
            ) : (
              <p className="px-1 text-[11px] text-muted">Najedź na miesiąc, aby zobaczyć szczegóły</p>
            )}
          </div>

          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Wykonanie vs budżet">
            {[0.25, 0.5, 0.75, 1].map((tick) => {
              const y = pad.top + innerH * (1 - tick);
              return (
                <line
                  key={tick}
                  x1={pad.left}
                  x2={w - pad.right}
                  y1={y}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth={1}
                />
              );
            })}
            {data.map((d, i) => {
              const gx = pad.left + i * groupW + groupW / 2;
              const bars = [
                { val: d.incomeBudget, color: COLORS.incomeBudget, offset: -barW * 1.5 },
                { val: d.incomeTracked, color: COLORS.incomeTracked, offset: -barW * 0.5 },
                { val: d.expenseBudget, color: COLORS.expenseBudget, offset: barW * 0.5 },
                { val: d.expenseTracked, color: COLORS.expenseTracked, offset: barW * 1.5 },
              ];
              const isHighlight = highlightMonth === d.month;
              return (
                <g key={d.month}>
                  {bars.map((b) => {
                    const bh = (b.val / max) * innerH;
                    return (
                      <rect
                        key={`${b.color}-${b.offset}`}
                        x={gx + b.offset - barW / 2}
                        y={pad.top + innerH - bh}
                        width={barW}
                        height={Math.max(bh, 0)}
                        fill={b.color}
                        opacity={isHighlight ? 1 : 0.9}
                        rx={2}
                      />
                    );
                  })}
                  <rect
                    x={pad.left + i * groupW}
                    y={pad.top}
                    width={groupW}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  <text
                    x={gx}
                    y={h - 8}
                    textAnchor="middle"
                    className={cn(
                      "fill-slate-400 text-[9px]",
                      isHighlight && "fill-slate-700 font-medium"
                    )}
                  >
                    {d.shortLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-[11px] text-muted">
            <Legend color={COLORS.incomeTracked} label="Przychody (wyk.)" />
            <Legend color={COLORS.incomeBudget} label="Przychody (budżet)" />
            <Legend color={COLORS.expenseTracked} label="Wydatki (wyk.)" />
            <Legend color={COLORS.expenseBudget} label="Wydatki (budżet)" />
          </div>
        </>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
