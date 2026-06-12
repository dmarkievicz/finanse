"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Calendar,
  ChevronDown,
  Download,
  FolderTree,
  Plus,
  Search,
} from "lucide-react";
import {
  buildCategoriesUrl,
  type CategoriesPeriodPreset,
} from "@/lib/categories/period";
import type { CategoriesTab } from "@/lib/queries/category-analytics";
import { PageHeader } from "@/components/page-header";
import { FilterTabs, PageToolbar } from "@/components/layout";
import { validateCustomDateRange } from "@/lib/transactions/date-presets";
import { cn } from "@/lib/utils";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";

const PERIOD_OPTIONS: { value: CategoriesPeriodPreset; label: string }[] = [
  { value: "this_month", label: "Bieżący miesiąc" },
  { value: "prev_month", label: "Poprzedni miesiąc" },
  { value: "this_year", label: "Bieżący rok" },
  { value: "last_12_months", label: "Ostatnie 12 miesięcy" },
  { value: "custom", label: "Zakres własny" },
];

const TABS: { value: CategoriesTab; label: string }[] = [
  { value: "expense", label: "Wydatki" },
  { value: "income", label: "Przychody" },
  { value: "all", label: "Wszystkie" },
  { value: "budgeted", label: "Budżetowane" },
  { value: "no_budget", label: "Bez budżetu" },
  { value: "tidy", label: "Do uporządkowania" },
];

const btnAction =
  "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition hover:bg-slate-50";

interface CategoriesToolbarProps {
  periodLabel: string;
  periodPreset: CategoriesPeriodPreset;
  dateFrom?: string;
  dateTo?: string;
  tab: CategoriesTab;
  showEmpty: boolean;
  search: string;
  baseParams: Record<string, string | undefined>;
}

export function CategoriesToolbar({
  periodLabel,
  periodPreset,
  dateFrom,
  dateTo,
  tab,
  showEmpty,
  search,
  baseParams,
}: CategoriesToolbarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [periodOpen, setPeriodOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [from, setFrom] = useState(dateFrom ?? "");
  const [to, setTo] = useState(dateTo ?? "");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [q, setQ] = useState(search);
  const [addOpen, setAddOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  function exportCsv() {
    window.location.href = `/api/categories/export?${new URLSearchParams(
      Object.entries(baseParams).filter(([, v]) => v) as [string, string][]
    ).toString()}`;
  }

  function applyCustom() {
    const err = validateCustomDateRange(from, to);
    if (err) {
      setValidationError(err);
      return;
    }
    setCustomOpen(false);
    navigate(buildCategoriesUrl({ period: "custom", from, to }, baseParams));
  }

  useEffect(() => {
    if (!periodOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(e.target as Node)) {
        setPeriodOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [periodOpen]);

  const tabItems = TABS.map((t) => ({
    value: t.value,
    label: t.label,
    href: buildCategoriesUrl({ tab: t.value }, baseParams),
  }));

  return (
    <>
      <div className="space-y-5">
        <PageHeader
          title="Kategorie"
          description={`Analiza wydatków i przychodów · ${periodLabel}`}
          action={
            <PageToolbar>
              <div className="relative" ref={periodRef}>
                <button
                  type="button"
                  onClick={() => setPeriodOpen(!periodOpen)}
                  disabled={pending}
                  className={cn(btnAction, "text-foreground")}
                >
                  <Calendar className="h-4 w-4" />
                  {periodLabel}
                  <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                </button>
                {periodOpen && (
                  <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-border bg-card p-1 shadow-lg">
                    {PERIOD_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setPeriodOpen(false);
                          if (opt.value === "custom") {
                            setFrom(dateFrom ?? "");
                            setTo(dateTo ?? "");
                            setValidationError(null);
                            setCustomOpen(true);
                            return;
                          }
                          navigate(
                            buildCategoriesUrl({ period: opt.value, tab }, baseParams)
                          );
                        }}
                        className={cn(
                          "block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50",
                          periodPreset === opt.value && "bg-slate-50 font-semibold text-foreground"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Dodaj kategorię
              </button>
              <button
                type="button"
                onClick={() => navigate(buildCategoriesUrl({ tab: "tidy" }, baseParams))}
                className={cn(btnAction, "text-muted hover:text-foreground")}
              >
                <FolderTree className="h-4 w-4" />
                Porządkuj
              </button>
              <button
                type="button"
                onClick={exportCsv}
                className={cn(btnAction, "text-foreground")}
              >
                <Download className="h-4 w-4" />
                Eksport
              </button>
            </PageToolbar>
          }
        />

        <FilterTabs items={tabItems} active={tab} label="Typ:" />

        {tab !== "tidy" && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative min-w-0 flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    navigate(buildCategoriesUrl({ q }, { ...baseParams, q }));
                  }
                }}
                placeholder="Szukaj kategorii…"
                className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={showEmpty}
                onChange={(e) =>
                  navigate(
                    buildCategoriesUrl({ showEmpty: e.target.checked }, baseParams)
                  )
                }
                className="rounded border-border"
              />
              Pokaż kategorie bez transakcji
            </label>
          </div>
        )}
      </div>

      {customOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCustomOpen(false);
          }}
        >
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
            <h3 className="font-semibold text-foreground">Zakres własny</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted">Data od</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setValidationError(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Data do</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setValidationError(null);
                  }}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </div>
              {validationError && (
                <p className="text-sm text-red-600" role="alert">
                  {validationError}
                </p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-muted hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={applyCustom}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white"
              >
                Zastosuj
              </button>
            </div>
          </div>
        </div>
      )}

      <CategoryFormDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
