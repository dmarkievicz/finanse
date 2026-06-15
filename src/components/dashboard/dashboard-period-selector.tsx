"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import {
  buildBudgetDashboardUrl,
  MONTH_NAMES_PL,
  type BudgetDashboardSelection,
} from "@/lib/dashboard/budget-period";
import { cn } from "@/lib/utils";

interface DashboardPeriodSelectorProps {
  selection: BudgetDashboardSelection;
  yearOptions: number[];
}

const selectClass =
  "h-9 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium text-slate-800 shadow-sm transition hover:border-slate-300 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

export function DashboardPeriodSelector({
  selection,
  yearOptions,
}: DashboardPeriodSelectorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  const yearValue =
    selection.yearParam === "all"
      ? "all"
      : selection.yearParam === "current"
        ? "current"
        : String(selection.resolvedYear);

  const periodValue = selection.isAllData
    ? "all_history"
    : selection.isTotalYear
      ? "total_year"
      : selection.periodParam === "current_month"
        ? "current_month"
        : String(selection.resolvedMonth);

  const urlBase = { year: yearValue, period: periodValue };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-60")}>
      <label className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted">Rok</span>
        <div className="relative">
          <select
            value={yearValue}
            onChange={(e) => {
              const year = e.target.value;
              let period: string;
              if (year === "all") {
                period = "all_history";
              } else if (year === "current") {
                period = selection.isAllData ? "current_month" : periodValue;
              } else {
                period = "total_year";
              }
              navigate(buildBudgetDashboardUrl({ year, period }, urlBase));
            }}
            className={selectClass}
          >
            <option value="current">Bieżący rok</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
            <option value="all">Cała historia</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </label>

      <label className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-muted">Okres</span>
        <div className="relative">
          <select
            value={periodValue}
            disabled={selection.isAllData}
            onChange={(e) => {
              navigate(buildBudgetDashboardUrl({ period: e.target.value }, urlBase));
            }}
            className={cn(selectClass, selection.isAllData && "cursor-not-allowed opacity-50")}
          >
            {selection.isAllData ? (
              <option value="all_history">Cała historia</option>
            ) : (
              <>
                <option value="total_year">Cały rok</option>
                <option value="current_month">Bieżący miesiąc</option>
                {MONTH_NAMES_PL.map((name, i) => (
                  <option key={name} value={String(i + 1)}>
                    {name}
                  </option>
                ))}
              </>
            )}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        </div>
      </label>
    </div>
  );
}
