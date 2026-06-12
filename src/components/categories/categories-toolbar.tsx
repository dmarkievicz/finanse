"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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

const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50";

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
  const [q, setQ] = useState(search);
  const [addOpen, setAddOpen] = useState(false);

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  function exportCsv() {
    window.location.href = `/api/categories/export?${new URLSearchParams(
      Object.entries(baseParams).filter(([, v]) => v) as [string, string][]
    ).toString()}`;
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Kategorie</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Analiza wydatków i przychodów według kategorii
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setPeriodOpen(!periodOpen)}
                className={btnSecondary}
                disabled={pending}
              >
                <Calendar className="h-4 w-4 text-slate-400" />
                {periodLabel}
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>
              {periodOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
                  {PERIOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setPeriodOpen(false);
                        if (opt.value === "custom") {
                          setCustomOpen(true);
                          return;
                        }
                        navigate(
                          buildCategoriesUrl({ period: opt.value, tab }, baseParams)
                        );
                      }}
                      className={cn(
                        "block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-50",
                        periodPreset === opt.value && "bg-slate-50 font-semibold"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setAddOpen(true)} className={btnSecondary}>
              <Plus className="h-4 w-4" />
              Dodaj kategorię
            </button>
            <button
              type="button"
              onClick={() => navigate(buildCategoriesUrl({ tab: "tidy" }, baseParams))}
              className={btnSecondary}
            >
              <FolderTree className="h-4 w-4" />
              Porządkuj
            </button>
            <button type="button" onClick={exportCsv} className={btnSecondary}>
              <Download className="h-4 w-4" />
              Eksport
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => navigate(buildCategoriesUrl({ tab: t.value }, baseParams))}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition",
                tab === t.value
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab !== "tidy" && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={showEmpty}
                onChange={(e) =>
                  navigate(
                    buildCategoriesUrl({ showEmpty: e.target.checked }, baseParams)
                  )
                }
                className="rounded border-slate-300"
              />
              Pokaż kategorie bez transakcji
            </label>
          </div>
        )}
      </div>

      {customOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="font-semibold text-slate-900">Zakres własny</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500">Od</label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-500">Do</label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomOpen(false);
                  navigate(
                    buildCategoriesUrl(
                      { period: "custom", from, to },
                      baseParams
                    )
                  );
                }}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white"
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
