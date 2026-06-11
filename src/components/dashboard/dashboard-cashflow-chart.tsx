"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CashflowMonth } from "@/lib/queries/dashboard";
import type { DashboardChartRange } from "@/lib/dashboard/period";
import { buildDashboardUrl, type DashboardPeriodPreset } from "@/lib/dashboard/period";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DashboardCashflowChartProps {
  data: CashflowMonth[];
  chartRange: DashboardChartRange;
  periodPreset: DashboardPeriodPreset;
  dateFrom?: string;
  dateTo?: string;
}

const RANGE_OPTIONS: { value: DashboardChartRange; label: string }[] = [
  { value: "6", label: "6M" },
  { value: "12", label: "12M" },
  { value: "ytd", label: "YTD" },
];

export function DashboardCashflowChart({
  data,
  chartRange,
  periodPreset,
  dateFrom,
  dateTo,
}: DashboardCashflowChartProps) {
  const urlBase = { period: periodPreset, from: dateFrom, to: dateTo, chart: chartRange };
  const router = useRouter();
  const [hover, setHover] = useState<number | null>(null);

  const visible = useMemo(() => {
    if (chartRange === "12") return data.slice(-12);
    if (chartRange === "ytd") {
      const year = new Date().getFullYear();
      return data.filter((d) => d.year === year);
    }
    return data.slice(-6);
  }, [data, chartRange]);

  const withData = visible.filter((d) => d.hasData);
  const max = Math.max(...withData.flatMap((d) => [d.income, d.expenses, Math.abs(d.surplus)]), 1);
  const w = 480;
  const h = 180;
  const pad = { top: 16, bottom: 28, left: 8, right: 8 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const step = visible.length > 1 ? innerW / (visible.length - 1) : innerW;

  function y(val: number) {
    return pad.top + innerH - (val / max) * innerH;
  }

  function buildPath(key: "income" | "expenses") {
    let started = false;
    return visible
      .map((d, i) => {
        if (!d.hasData) {
          started = false;
          return "";
        }
        const x = pad.left + i * step;
        const cmd = started ? "L" : "M";
        started = true;
        return `${cmd} ${x} ${y(d[key])}`;
      })
      .filter(Boolean)
      .join(" ");
  }

  const incomePath = buildPath("income");
  const expensePath = buildPath("expenses");

  const hovered = hover != null ? visible[hover] : null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Przepływy pieniężne</h3>
          <p className="text-xs text-muted">Przychody, wydatki i nadwyżka — miesięcznie</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  router.push(buildDashboardUrl({ chart: opt.value }, urlBase))
                }
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium",
                  chartRange === opt.value
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {withData.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-xl bg-slate-50 text-sm text-muted">
          Brak danych cashflow w wybranym zakresie
        </div>
      ) : (
        <div className="relative">
          {hovered?.hasData && (
            <div className="mb-2 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs">
              <p className="font-semibold">{hovered.label}</p>
              <p className="text-emerald-700">Przychody: {formatPln(hovered.income)}</p>
              <p className="text-red-600">Wydatki: {formatPln(hovered.expenses)}</p>
              <p className={hovered.surplus >= 0 ? "text-emerald-700" : "text-red-600"}>
                Nadwyżka: {formatPln(hovered.surplus)}
              </p>
            </div>
          )}
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Wykres cashflow">
            {[0.25, 0.5, 0.75].map((p) => (
              <line
                key={p}
                x1={pad.left}
                y1={pad.top + innerH * p}
                x2={w - pad.right}
                y2={pad.top + innerH * p}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
            ))}
            {incomePath && (
              <path d={incomePath} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" />
            )}
            {expensePath && (
              <path d={expensePath} fill="none" stroke="#ef4444" strokeWidth={2.5} strokeLinecap="round" />
            )}
            {visible.map((d, i) => {
              const x = pad.left + i * step;
              if (!d.hasData) {
                return (
                  <text
                    key={`gap-${i}`}
                    x={x}
                    y={pad.top + innerH / 2}
                    textAnchor="middle"
                    className="fill-slate-300 text-[9px]"
                  >
                    —
                  </text>
                );
              }
              return (
                <g key={i}>
                  <circle
                    cx={x}
                    cy={y(d.income)}
                    r={hover === i ? 5 : 3}
                    fill="#10b981"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  <circle
                    cx={x}
                    cy={y(d.expenses)}
                    r={hover === i ? 5 : 3}
                    fill="#ef4444"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                </g>
              );
            })}
          </svg>
          <div className="mt-1 flex justify-between px-1 text-[10px] text-muted">
            {visible.map((d) => (
              <span key={`${d.year}-${d.month}`} className={!d.hasData ? "opacity-40" : ""}>
                {d.label}
              </span>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Przychody
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Wydatki
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
