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

const btnClass =
  "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 shadow-sm hover:border-slate-300";

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
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      <label className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-slate-500">Rok</span>
        <div className="relative">
          <select
            value={yearValue}
            onChange={(e) => {
              const year = e.target.value;
              const period =
                year === "all"
                  ? "all_history"
                  : selection.isAllData
                    ? "current_month"
                    : periodValue;
              navigate(buildBudgetDashboardUrl({ year, period }, urlBase));
            }}
            className={cn(btnClass, "appearance-none pr-8")}
          >
            <option value="current">Bieżący rok</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
            <option value="all">Cała historia</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </label>

      <label className="flex items-center gap-2">
        <span className="text-[12px] font-medium text-slate-500">Okres</span>
        <div className="relative">
          <select
            value={periodValue}
            disabled={selection.isAllData}
            onChange={(e) => {
              navigate(buildBudgetDashboardUrl({ period: e.target.value }, urlBase));
            }}
            className={cn(
              btnClass,
              "appearance-none pr-8",
              selection.isAllData && "cursor-not-allowed opacity-50"
            )}
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
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </label>
    </div>
  );
}
