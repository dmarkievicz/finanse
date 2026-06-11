"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CashflowMonth } from "@/lib/queries/dashboard";
import type { DashboardChartRange } from "@/lib/dashboard/period";
import { buildDashboardUrl, type DashboardPeriodPreset } from "@/lib/dashboard/period";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardEmpty, DashboardPanel, DashboardPanelHeader } from "@/components/dashboard/dashboard-ui";

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
  const h = 160;
  const pad = { top: 12, bottom: 24, left: 4, right: 4 };
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

  const rangeToggle = (
    <div className="flex rounded-lg bg-slate-100 p-0.5">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => router.push(buildDashboardUrl({ chart: opt.value }, urlBase))}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12px] font-medium transition",
            chartRange === opt.value
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <DashboardPanel>
      <DashboardPanelHeader
        title="Przepływy pieniężne"
        subtitle="Przychody i wydatki miesięcznie"
        action={rangeToggle}
      />

      {withData.length === 0 ? (
        <DashboardEmpty>Brak danych w wybranym zakresie</DashboardEmpty>
      ) : (
        <>
          {hovered?.hasData && (
            <div className="mb-3 flex flex-wrap gap-4 rounded-lg bg-slate-50 px-3 py-2 text-[12px]">
              <span className="font-medium text-slate-700">{hovered.label}</span>
              <span className="text-emerald-600">+{formatPln(hovered.income)}</span>
              <span className="text-rose-500">−{formatPln(hovered.expenses)}</span>
              <span className={hovered.surplus >= 0 ? "text-emerald-600" : "text-rose-500"}>
                = {formatPln(hovered.surplus)}
              </span>
            </div>
          )}
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Wykres cashflow">
            {[0.5].map((p) => (
              <line
                key={p}
                x1={pad.left}
                y1={pad.top + innerH * p}
                x2={w - pad.right}
                y2={pad.top + innerH * p}
                stroke="#f1f5f9"
                strokeWidth={1}
              />
            ))}
            {incomePath && (
              <path d={incomePath} fill="none" stroke="#34d399" strokeWidth={2} strokeLinecap="round" />
            )}
            {expensePath && (
              <path d={expensePath} fill="none" stroke="#fb7185" strokeWidth={2} strokeLinecap="round" />
            )}
            {visible.map((d, i) => {
              const x = pad.left + i * step;
              if (!d.hasData) return null;
              return (
                <g key={i}>
                  <rect
                    x={x - 12}
                    y={pad.top}
                    width={24}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                  <circle
                    cx={x}
                    cy={y(d.income)}
                    r={hover === i ? 4 : 2.5}
                    fill="#34d399"
                  />
                  <circle
                    cx={x}
                    cy={y(d.expenses)}
                    r={hover === i ? 4 : 2.5}
                    fill="#fb7185"
                  />
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex justify-between text-[11px] text-slate-400">
            {visible.map((d) => (
              <span key={`${d.year}-${d.month}`} className={!d.hasData ? "opacity-30" : ""}>
                {d.label}
              </span>
            ))}
          </div>
          <div className="mt-3 flex gap-5 text-[12px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Przychody
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              Wydatki
            </span>
          </div>
        </>
      )}
    </DashboardPanel>
  );
}
