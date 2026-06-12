"use client";

import { useState } from "react";
import type { MonthlyBudgetPoint } from "@/lib/dashboard/budget-metrics";
import { formatPln } from "@/lib/format";
import { SectionCard, SectionCardHeader } from "@/components/layout";

interface TrackedVsBudgetChartProps {
  data: MonthlyBudgetPoint[];
  highlightMonth?: number | null;
  year: number;
}

export function TrackedVsBudgetChart({ data, highlightMonth, year }: TrackedVsBudgetChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const withData = data.filter((d) => d.hasData || d.incomeBudget > 0 || d.expenseBudget > 0);
  const max = Math.max(
    ...data.flatMap((d) => [
      d.incomeTracked,
      d.expenseTracked,
      d.incomeBudget,
      d.expenseBudget,
    ]),
    1
  );

  const w = 400;
  const h = 180;
  const pad = { top: 12, right: 8, bottom: 28, left: 8 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const groupW = innerW / 12;
  const barW = groupW * 0.18;

  const hovered = hover != null ? data[hover] : null;

  return (
    <SectionCard>
      <SectionCardHeader
        title="Wykonanie vs budżet"
        subtitle={`Miesiące ${year}`}
      />

      {withData.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Brak danych w tym roku</p>
      ) : (
        <>
          {hovered && (
            <div className="mb-3 flex flex-wrap gap-3 rounded-lg bg-slate-50 px-3 py-2 text-[11px]">
              <span className="font-medium text-slate-700">{hovered.label}</span>
              <span className="text-emerald-600">Przychody: {formatPln(hovered.incomeTracked)}</span>
              <span className="text-slate-400">/ budżet {formatPln(hovered.incomeBudget)}</span>
              <span className="text-rose-500">Wydatki: {formatPln(hovered.expenseTracked)}</span>
              <span className="text-slate-400">/ budżet {formatPln(hovered.expenseBudget)}</span>
            </div>
          )}

          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
            {data.map((d, i) => {
              const gx = pad.left + i * groupW + groupW / 2;
              const bars = [
                { val: d.incomeBudget, color: "#a7f3d0", offset: -barW * 1.5 },
                { val: d.incomeTracked, color: "#10b981", offset: -barW * 0.5 },
                { val: d.expenseBudget, color: "#fecdd3", offset: barW * 0.5 },
                { val: d.expenseTracked, color: "#f43f5e", offset: barW * 1.5 },
              ];
              const isHighlight = highlightMonth === d.month;
              return (
                <g key={d.month}>
                  {bars.map((b) => {
                    const bh = (b.val / max) * innerH;
                    return (
                      <rect
                        key={b.color + b.offset}
                        x={gx + b.offset - barW / 2}
                        y={pad.top + innerH - bh}
                        width={barW}
                        height={Math.max(bh, 0)}
                        fill={b.color}
                        opacity={isHighlight ? 1 : 0.85}
                        rx={1}
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
                    y={h - 6}
                    textAnchor="middle"
                    className="fill-slate-400 text-[9px]"
                  >
                    {d.shortLabel}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-2 flex flex-wrap gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Przychody (wyk.)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-emerald-200" /> Przychody (budżet)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-rose-500" /> Wydatki (wyk.)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-rose-200" /> Wydatki (budżet)
            </span>
          </div>
        </>
      )}
    </SectionCard>
  );
}
