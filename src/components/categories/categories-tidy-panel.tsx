"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, GitMerge } from "lucide-react";
import type { CategoriesAnalyticsData } from "@/lib/queries/category-analytics";
import { formatPln } from "@/lib/format";
import { CategoryMergeDialog } from "@/components/categories/category-merge-dialog";

interface CategoriesTidyPanelProps {
  data: CategoriesAnalyticsData;
  allCategories: { id: string; name: string }[];
}

export function CategoriesTidyPanel({ data, allCategories }: CategoriesTidyPanelProps) {
  const { tidy } = data;
  const [mergeSource, setMergeSource] = useState<{
    id: string;
    name: string;
    txCount: number;
  } | null>(null);

  const hasIssues =
    tidy.duplicates.length > 0 ||
    tidy.uncategorizedExpense.count > 0 ||
    tidy.uncategorizedIncome.count > 0 ||
    tidy.emptyCategories.length > 0;

  if (!hasIssues) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-8 text-center">
        <p className="font-medium text-emerald-800">Kategorie wyglądają dobrze</p>
        <p className="mt-1 text-sm text-emerald-700">
          Nie znaleziono duplikatów ani transakcji bez kategorii w wybranym okresie.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(tidy.uncategorizedExpense.count > 0 || tidy.uncategorizedIncome.count > 0) && (
        <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <h3 className="font-semibold text-slate-900">Transakcje bez kategorii</h3>
              <p className="mt-1 text-sm text-slate-600">
                {tidy.uncategorizedExpense.count > 0 && (
                  <>
                    Wydatki: {tidy.uncategorizedExpense.count} transakcji (
                    {formatPln(tidy.uncategorizedExpense.totalPln)})
                    {" · "}
                  </>
                )}
                {tidy.uncategorizedIncome.count > 0 && (
                  <>
                    Przychody: {tidy.uncategorizedIncome.count} transakcji (
                    {formatPln(tidy.uncategorizedIncome.totalPln)})
                  </>
                )}
              </p>
              <Link
                href={`/transactions?type=expense&from=${data.period.current.from}&to=${data.period.current.to}&period=custom`}
                className="mt-2 inline-block text-sm font-medium text-amber-800 hover:underline"
              >
                Przejrzyj transakcje →
              </Link>
            </div>
          </div>
        </section>
      )}

      {tidy.duplicates.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Podejrzane duplikaty</h3>
          <p className="mt-1 text-sm text-slate-500">
            Kategorie o tej samej nazwie (różna wielkość liter lub spacje)
          </p>
          <ul className="mt-4 space-y-4">
            {tidy.duplicates.map((group) => (
              <li key={group.normalizedName} className="rounded-lg border border-slate-100 p-4">
                <p className="text-xs font-medium uppercase text-slate-400">
                  {group.normalizedName}
                </p>
                <ul className="mt-2 space-y-2">
                  {group.categories.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span>{c.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500">
                          {c.txCount} trans. · {formatPln(c.totalPln)}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setMergeSource({
                              id: c.id,
                              name: c.name,
                              txCount: c.txCount,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium hover:bg-slate-200"
                        >
                          <GitMerge className="h-3 w-3" />
                          Scal
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tidy.emptyCategories.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">
            Kategorie bez transakcji ({tidy.emptyCategories.length})
          </h3>
          <p className="mt-1 text-sm text-slate-500">W wybranym okresie</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {tidy.emptyCategories.slice(0, 30).map((c) => (
              <li
                key={c.id}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
              >
                {c.name}
              </li>
            ))}
            {tidy.emptyCategories.length > 30 && (
              <li className="px-2 py-1 text-xs text-slate-400">
                +{tidy.emptyCategories.length - 30} więcej
              </li>
            )}
          </ul>
        </section>
      )}

      {mergeSource && (
        <CategoryMergeDialog
          open
          onClose={() => setMergeSource(null)}
          source={mergeSource}
          categories={allCategories}
        />
      )}
    </div>
  );
}
