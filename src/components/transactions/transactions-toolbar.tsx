"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown, Download, Filter, Plus, Trash2 } from "lucide-react";
import {
  filterChipActive,
  filterChipBase,
  filterChipIdle,
} from "@/components/layout/filter-chips";
import { cn } from "@/lib/utils";
import {
  buildPeriodUrl,
  buildTransactionsExportUrl,
  buildTransactionsUrl,
  isMoreMenuActive,
  isPeriodPresetActive,
  periodLabel,
  type TransactionFilterState,
  type TransactionSortField,
} from "@/lib/transactions/filter-state";
import {
  MORE_PERIOD_PRESETS,
  PERIOD_PRESETS,
  PRIMARY_PERIOD_PRESETS,
  validateCustomDateRange,
  type PeriodPreset,
} from "@/lib/transactions/date-presets";

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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [moreOpen, setMoreOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [from, setFrom] = useState(filterState.dateFrom ?? "");
  const [to, setTo] = useState(filterState.dateTo ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const label = periodLabel(filterState);
  const moreActive = isMoreMenuActive(filterState);

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  function applyPreset(preset: PeriodPreset) {
    if (preset === "custom") {
      setFrom(filterState.dateFrom ?? "");
      setTo(filterState.dateTo ?? "");
      setValidationError(null);
      setCustomOpen(true);
      return;
    }
    navigate(buildPeriodUrl(filterState, preset));
  }

  function applyCustom(clear = false) {
    if (clear) {
      setFrom("");
      setTo("");
      setValidationError(null);
      return;
    }
    const err = validateCustomDateRange(from, to);
    if (err) {
      setValidationError(err);
      return;
    }
    setCustomOpen(false);
    navigate(buildPeriodUrl(filterState, "custom", { from, to }));
  }

  useEffect(() => {
    if (!moreOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    const id = window.setTimeout(() => {
      document.addEventListener("click", onClickOutside);
    }, 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("click", onClickOutside);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!customOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCustomOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [customOpen]);

  const periodChip = (preset: PeriodPreset, text: string) => {
    const active = isPeriodPresetActive(filterState, preset);
    if (preset === "custom") {
      return (
        <button
          key={preset}
          type="button"
          disabled={pending}
          onClick={() => applyPreset("custom")}
          className={cn(filterChipBase, active ? filterChipActive : filterChipIdle)}
        >
          {text}
        </button>
      );
    }
    return (
      <button
        key={preset}
        type="button"
        disabled={pending}
        onClick={() => applyPreset(preset)}
        className={cn(filterChipBase, active ? filterChipActive : filterChipIdle)}
      >
        {text}
      </button>
    );
  };

  return (
    <>
      <div className="space-y-5">
        {/* Nagłówek + akcje */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Transakcje</h1>
            <p className="mt-1 text-sm text-muted">
              <span className="tabular-nums">{total.toLocaleString("pl-PL")}</span> transakcji w
              zakresie:{" "}
              <span className="font-medium text-foreground">{label}</span>
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
              <span className="hidden sm:inline">Filtry</span>
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
              <span className="hidden sm:inline">Eksport</span>
            </a>
            <Link
              href="/transactions/trash"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-muted hover:bg-slate-50 hover:text-foreground"
            >
              <Trash2 className="h-4 w-4" />
              <span className="hidden sm:inline">Kosz</span>
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

        {/* Mobile: compact selects */}
        <div className="flex flex-col gap-2 md:hidden">
          <label className="text-xs font-medium text-muted">
            Okres
            <select
              value={
                moreActive
                  ? filterState.period
                  : isPeriodPresetActive(filterState, "custom")
                    ? "custom"
                    : filterState.period
              }
              disabled={pending}
              onChange={(e) => {
                const v = e.target.value as PeriodPreset;
                if (v === "custom") applyPreset("custom");
                else applyPreset(v);
              }}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
            >
              {PERIOD_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-muted">
            Typ
            <select
              value={filterState.type}
              disabled={pending}
              onChange={(e) => {
                navigate(
                  buildTransactionsUrl(filterState, {
                    type: e.target.value as TransactionFilterState["type"],
                    page: 1,
                  })
                );
              }}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
            >
              {TYPE_TABS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Desktop: okres — „Więcej” poza overflow-x-auto, żeby menu nie było obcinane */}
        <div className="hidden md:block">
          <p className="mb-2 text-xs font-medium text-muted">Okres:</p>
          <div className="flex items-start gap-1.5">
            <div className="-mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
              {PRIMARY_PERIOD_PRESETS.map((p) => periodChip(p.value, p.label))}
            </div>
            <div className="relative shrink-0" ref={moreRef}>
              <button
                type="button"
                disabled={pending}
                onClick={(e) => {
                  e.stopPropagation();
                  setMoreOpen((o) => !o);
                }}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                className={cn(
                  filterChipBase,
                  "inline-flex items-center gap-1",
                  moreActive ? filterChipActive : filterChipIdle
                )}
              >
                {moreActive
                  ? MORE_PERIOD_PRESETS.find((p) => p.value === filterState.period)?.label ??
                    "Więcej"
                  : "Więcej"}
                <ChevronDown
                  className={cn("h-3.5 w-3.5 opacity-70 transition", moreOpen && "rotate-180")}
                />
              </button>
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 min-w-[10.5rem] rounded-xl border border-border bg-card p-1 shadow-lg"
                >
                  {MORE_PERIOD_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreOpen(false);
                        applyPreset(p.value);
                      }}
                      className={cn(
                        "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50",
                        filterState.period === p.value && "bg-slate-50 font-semibold text-foreground"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Desktop: typ + sort + widok */}
        <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-medium text-muted">Typ:</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_TABS.map((t) => (
                <Link
                  key={t.value}
                  href={buildTransactionsUrl(filterState, { type: t.value, page: 1 })}
                  className={cn(
                    filterChipBase,
                    "text-sm",
                    filterState.type === t.value ? filterChipActive : filterChipIdle
                  )}
                >
                  {t.label}
                </Link>
              ))}
            </div>
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
                  navigate(
                    buildTransactionsUrl(filterState, { sort, sortDir: dir, page: 1 })
                  );
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
                href={buildTransactionsUrl(filterState, { view: v.value, page: 1 })}
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

      {/* Modal zakresu własnego */}
      {customOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-range-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCustomOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
            <h3 id="custom-range-title" className="font-semibold text-foreground">
              Zakres własny
            </h3>
            <div className="mt-4 space-y-3">
              <div>
                <label htmlFor="custom-from" className="text-xs font-medium text-muted">
                  Data od
                </label>
                <input
                  id="custom-from"
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setValidationError(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="custom-to" className="text-xs font-medium text-muted">
                  Data do
                </label>
                <input
                  id="custom-to"
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setValidationError(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              {validationError && (
                <p className="text-sm text-red-600" role="alert">
                  {validationError}
                </p>
              )}
            </div>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => applyCustom(true)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-slate-50"
              >
                Wyczyść
              </button>
              <button
                type="button"
                onClick={() => applyCustom(false)}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                Zastosuj
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
