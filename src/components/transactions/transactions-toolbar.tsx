"use client";

import Link from "next/link";
import { Download, Filter, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildTransactionsExportUrl,
  buildTransactionsUrl,
  periodLabel,
  type TransactionFilterState,
  type TransactionSortField,
} from "@/lib/transactions/filter-state";
import { PERIOD_PRESETS } from "@/lib/transactions/date-presets";

const TYPE_TABS = [
  { value: "all", label: "Wszystkie" },
  { value: "expense", label: "Wydatki" },
  { value: "income", label: "Przychody" },
  { value: "transfer", label: "Transfery" },
] as const;

const VIEW_MODES = [
  { value: "grouped", label: "Po dniach" },
  { value: "list", label: "Lista" },
  { value: "monthly", label: "Miesiąc" },
] as const;

interface TransactionsToolbarProps {
  filterState: TransactionFilterState;
  total: number;
  activeFilterCount: number;
  onToggleFilters: () => void;
  filtersOpen: boolean;
}

export function TransactionsToolbar({
  filterState,
  total,
  activeFilterCount,
  onToggleFilters,
  filtersOpen,
}: TransactionsToolbarProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Transakcje</h1>
          <p className="mt-1 text-sm text-muted">
            {total.toLocaleString("pl-PL")} w wybranym zakresie ·{" "}
            <span className="font-medium text-foreground">{periodLabel(filterState)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleFilters}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition",
              filtersOpen
                ? "border-primary bg-primary/5 text-primary"
                : "border-border bg-card text-foreground hover:bg-slate-50"
            )}
          >
            <Filter className="h-4 w-4" />
            Filtry
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <a
            href={buildTransactionsExportUrl(filterState)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Eksport
          </a>
          <Link
            href="/transactions/trash"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted hover:bg-slate-50 hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Kosz
          </Link>
          <Link
            href="/transactions/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nowa transakcja
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {PERIOD_PRESETS.map((p) => (
          <Link
            key={p.value}
            href={buildTransactionsUrl(filterState, {
              period: p.value,
              day: undefined,
              dateFrom: undefined,
              dateTo: undefined,
              page: 1,
            })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition sm:text-sm",
              filterState.period === p.value && !filterState.day
                ? "bg-slate-800 text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {TYPE_TABS.map((t) => (
            <Link
              key={t.value}
              href={buildTransactionsUrl(filterState, {
                type: t.value,
                page: 1,
              })}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition",
                filterState.type === t.value
                  ? "bg-primary text-white"
                  : "border border-border bg-card text-muted hover:text-foreground"
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted">
            Sortuj
            <select
              value={`${filterState.sort}:${filterState.sortDir}`}
              onChange={(e) => {
                const [sort, dir] = e.target.value.split(":") as [
                  TransactionSortField,
                  "asc" | "desc",
                ];
                window.location.href = buildTransactionsUrl(filterState, {
                  sort,
                  sortDir: dir,
                  page: 1,
                });
              }}
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium text-foreground"
            >
              <option value="date:desc">Data ↓</option>
              <option value="date:asc">Data ↑</option>
              <option value="amount:desc">Kwota PLN ↓</option>
              <option value="amount:asc">Kwota PLN ↑</option>
              <option value="category:asc">Kategoria A–Z</option>
              <option value="category:desc">Kategoria Z–A</option>
            </select>
          </label>
          {VIEW_MODES.map((v) => (
            <Link
              key={v.value}
              href={buildTransactionsUrl(filterState, {
                view: v.value,
                page: 1,
              })}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-xs font-medium transition",
                filterState.view === v.value
                  ? "border-primary bg-primary/5 text-primary"
                  : "border border-border text-muted hover:text-foreground"
              )}
            >
              {v.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
