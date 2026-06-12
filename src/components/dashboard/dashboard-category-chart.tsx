"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CategorySlice } from "@/lib/queries/dashboard";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DashboardEmpty,
  DashboardPanel,
  DashboardPanelHeader,
  dashboardLink,
} from "@/components/dashboard/dashboard-ui";

type TopLimit = 5 | 7 | "all";

interface DashboardCategoryChartProps {
  categories: CategorySlice[];
  categoriesFull: CategorySlice[];
  total: number;
  periodFrom: string;
  periodTo: string;
}

const LIMIT_OPTIONS: { value: TopLimit; label: string }[] = [
  { value: 5, label: "Top 5" },
  { value: 7, label: "Top 7" },
  { value: "all", label: "Wszystkie" },
];

export function DashboardCategoryChart({
  categories,
  categoriesFull,
  total,
  periodFrom,
  periodTo,
}: DashboardCategoryChartProps) {
  const [limit, setLimit] = useState<TopLimit>(5);

  const displayed = useMemo(() => {
    const source = limit === "all" ? categoriesFull : categories;
    if (limit === 5) return categories;
    if (limit === 7) return categoriesFull.slice(0, 7);
    return source.filter((c) => c.name !== "Pozostałe" || limit === "all");
  }, [categories, categoriesFull, limit]);

  const rangeToggle = (
    <div className="flex rounded-lg bg-slate-100 p-0.5">
      {LIMIT_OPTIONS.map((opt) => (
        <button
          key={String(opt.value)}
          type="button"
          onClick={() => setLimit(opt.value)}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-medium transition",
            limit === opt.value
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  if (total === 0 || categories.length === 0) {
    return (
      <DashboardPanel className="h-full">
        <DashboardPanelHeader title="Wydatki wg kategorii" subtitle="W wybranym okresie" />
        <DashboardEmpty>Brak wydatków w tym okresie</DashboardEmpty>
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel className="h-full">
      <DashboardPanelHeader
        title="Wydatki wg kategorii"
        subtitle={`Łącznie ${formatPln(total)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {rangeToggle}
            <Link
              href={`/categories?period=custom&from=${periodFrom}&to=${periodTo}`}
              className={`inline-flex items-center gap-1 ${dashboardLink}`}
            >
              Szczegóły
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      <div className="space-y-0.5">
        {displayed.map((c) => (
          <Link
            key={c.name}
            href={
              c.categoryId
                ? `/transactions?type=expense&category=${c.categoryId}&period=custom&from=${periodFrom}&to=${periodTo}`
                : `/transactions?type=expense&period=custom&from=${periodFrom}&to=${periodTo}`
            }
            className="block rounded-lg px-2 py-2 transition hover:bg-slate-50"
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
            </div>
          </Link>
        ))}
      </div>
    </DashboardPanel>
  );
}
