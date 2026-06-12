"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  GitMerge,
} from "lucide-react";
import type { CategoriesAnalyticsData, CategoryAnalyticsRow } from "@/lib/queries/category-analytics";
import { formatPln, formatPercent } from "@/lib/format";
import { CategoryTypeBadge } from "@/components/categories/category-type-badge";
import { CategorySparkline } from "@/components/categories/category-sparkline";
import { CategoryBudgetBar } from "@/components/categories/category-budget-bar";
import { buildCategoryTransactionsUrl } from "@/lib/categories/transactions-link";
import { trendClass, trendLabel } from "@/lib/categories/labels";
import { buildCategoriesUrl } from "@/lib/categories/period";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { CategoryMergeDialog } from "@/components/categories/category-merge-dialog";
import { cn } from "@/lib/utils";

interface CategoriesAnalyticsTableProps {
  data: CategoriesAnalyticsData;
  allCategories: { id: string; name: string }[];
  baseParams: Record<string, string | undefined>;
}

type SortField = CategoriesAnalyticsData["sort"];

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "amount", label: "Suma PLN" },
  { value: "tx", label: "Transakcje" },
  { value: "name", label: "Nazwa" },
  { value: "share", label: "Udział" },
  { value: "trend", label: "Zmiana" },
];

export function CategoriesAnalyticsTable({
  data,
  allCategories,
  baseParams,
}: CategoriesAnalyticsTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editRow, setEditRow] = useState<CategoryAnalyticsRow | null>(null);
  const [mergeRow, setMergeRow] = useState<CategoryAnalyticsRow | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const txType =
    data.tab === "income" ? "income" : data.tab === "expense" ? "expense" : undefined;

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSort(field: SortField) {
    const dir =
      data.sort === field && data.sortDir === "desc" ? "asc" : "desc";
    window.location.href = buildCategoriesUrl({ sort: field, dir }, baseParams);
  }

  if (!data.rows.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm font-medium text-slate-700">Brak transakcji w wybranym okresie</p>
        <p className="mt-1 text-sm text-slate-500">
          Zmień zakres dat albo włącz „Pokaż kategorie bez transakcji”.
        </p>
        <Link
          href={buildCategoriesUrl({ showEmpty: true }, baseParams)}
          className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
        >
          Pokaż wszystkie kategorie
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{data.rows.length} kategorii</span>
        <div className="flex flex-wrap gap-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleSort(opt.value)}
              className={cn(
                "rounded-md px-2 py-1 hover:bg-slate-100",
                data.sort === opt.value && "bg-slate-100 font-medium text-slate-800"
              )}
            >
              {opt.label}
              {data.sort === opt.value && (data.sortDir === "desc" ? " ↓" : " ↑")}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs text-slate-500">
              <th className="w-8 px-3 py-3" />
              <th className="px-3 py-3 font-medium">Kategoria</th>
              {(data.tab === "all") && <th className="px-3 py-3 font-medium">Typ</th>}
              <th className="px-3 py-3 text-right font-medium">Transakcje</th>
              <th className="px-3 py-3 text-right font-medium">Suma PLN</th>
              <th className="px-3 py-3 font-medium">Udział</th>
              <th className="px-3 py-3 text-right font-medium">Zmiana</th>
              {data.tab !== "income" && <th className="px-3 py-3 font-medium">Budżet</th>}
              <th className="px-3 py-3 font-medium">Trend</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <CategoryTableRows
                key={row.id}
                row={row}
                data={data}
                expanded={expanded.has(row.id)}
                onToggle={() => toggleExpand(row.id)}
                txType={txType}
                showType={data.tab === "all"}
                menuOpen={menuId === row.id}
                onMenuToggle={() => setMenuId(menuId === row.id ? null : row.id)}
                onEdit={() => {
                  setEditRow(row);
                  setMenuId(null);
                }}
                onMerge={() => {
                  setMergeRow(row);
                  setMenuId(null);
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.rows.map((row) => (
          <CategoryMobileCard
            key={row.id}
            row={row}
            data={data}
            expanded={expanded.has(row.id)}
            onToggle={() => toggleExpand(row.id)}
            txType={txType}
          />
        ))}
      </div>

      {editRow && (
        <CategoryFormDialog
          open
          onClose={() => setEditRow(null)}
          edit={{
            id: editRow.id,
            name: editRow.name,
            type: editRow.type,
            color: editRow.color,
          }}
        />
      )}
      {mergeRow && (
        <CategoryMergeDialog
          open
          onClose={() => setMergeRow(null)}
          source={{
            id: mergeRow.id,
            name: mergeRow.name,
            txCount: mergeRow.txCount,
          }}
          categories={allCategories}
        />
      )}
    </>
  );
}

function CategoryTableRows({
  row,
  data,
  expanded,
  onToggle,
  txType,
  showType,
  menuOpen,
  onMenuToggle,
  onEdit,
  onMerge,
}: {
  row: CategoryAnalyticsRow;
  data: CategoriesAnalyticsData;
  expanded: boolean;
  onToggle: () => void;
  txType?: "expense" | "income";
  showType: boolean;
  menuOpen: boolean;
  onMenuToggle: () => void;
  onEdit: () => void;
  onMerge: () => void;
}) {
  const hasSubs = row.subcategories.length > 0;
  const txUrl = buildCategoryTransactionsUrl({
    categoryId: row.id,
    period: data.period,
    txType: txType ?? (row.type === "income" ? "income" : "expense"),
  });

  return (
    <>
      <tr className="border-b border-slate-50 hover:bg-slate-50/60">
        <td className="px-3 py-3">
          {hasSubs ? (
            <button type="button" onClick={onToggle} className="rounded p-0.5 hover:bg-slate-100">
              {expanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400" />
              )}
            </button>
          ) : null}
        </td>
        <td className="px-3 py-3">
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: row.color ?? "#94a3b8" }}
            />
            <Link
              href={`/categories/${row.id}?period=${data.period.preset}${data.period.preset === "custom" ? `&from=${data.period.current.from}&to=${data.period.current.to}` : ""}`}
              className="font-medium text-slate-900 hover:text-primary hover:underline"
            >
              {row.name}
            </Link>
          </div>
        </td>
        {showType && (
          <td className="px-3 py-3">
            <CategoryTypeBadge type={row.type} />
          </td>
        )}
        <td className="px-3 py-3 text-right text-slate-600">{row.txCount}</td>
        <td className="px-3 py-3 text-right">
          <Link href={txUrl} className="font-semibold text-slate-900 hover:text-primary hover:underline">
            {row.totalPln > 0 ? formatPln(row.totalPln) : "—"}
          </Link>
        </td>
        <td className="px-3 py-3">
          <div className="flex min-w-[80px] items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-400"
                style={{ width: `${Math.min(row.sharePct, 100)}%` }}
              />
            </div>
            <span className="w-10 text-right text-xs text-slate-500">
              {row.sharePct > 0 ? formatPercent(row.sharePct) : "—"}
            </span>
          </div>
        </td>
        <td className={cn("px-3 py-3 text-right text-xs font-medium", trendClass(row.trendDelta))}>
          {trendLabel(row.trendDelta, row.trendPct)}
        </td>
        {data.tab !== "income" && (
          <td className="px-3 py-3">
            <CategoryBudgetBar
              spent={row.totalPln}
              limit={row.budgetLimit}
              categoryId={row.id}
              budgetYear={data.period.budgetYear}
              budgetMonth={data.period.budgetMonth}
              compact
            />
          </td>
        )}
        <td className="px-3 py-3">
          <CategorySparkline values={row.sparkline} color={row.color ?? "#64748b"} />
        </td>
        <td className="relative px-3 py-3">
          <button
            type="button"
            onClick={onMenuToggle}
            className="rounded p-1 hover:bg-slate-100"
          >
            <MoreHorizontal className="h-4 w-4 text-slate-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-3 top-full z-10 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={onEdit}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Edytuj
              </button>
              <Link
                href={txUrl}
                className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Transakcje
              </Link>
              <button
                type="button"
                onClick={onMerge}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <GitMerge className="h-3.5 w-3.5" /> Scal
              </button>
            </div>
          )}
        </td>
      </tr>
      {expanded &&
        row.subcategories.map((sub) => {
          const subUrl = buildCategoryTransactionsUrl({
            categoryId: row.id,
            subcategoryId: sub.id,
            period: data.period,
            txType: txType ?? "expense",
          });
          return (
            <tr key={sub.id} className="bg-slate-50/40 text-xs">
              <td />
              <td className="px-3 py-2 pl-10 text-slate-600">{sub.name}</td>
              {showType && <td />}
              <td className="px-3 py-2 text-right text-slate-500">{sub.txCount}</td>
              <td className="px-3 py-2 text-right">
                <Link href={subUrl} className="font-medium hover:underline">
                  {formatPln(sub.totalPln)}
                </Link>
              </td>
              <td className="px-3 py-2 text-slate-500">
                {formatPercent(sub.shareInCategoryPct)} kategorii
              </td>
              <td colSpan={data.tab !== "income" ? 4 : 3} />
            </tr>
          );
        })}
    </>
  );
}

function CategoryMobileCard({
  row,
  data,
  expanded,
  onToggle,
  txType,
}: {
  row: CategoryAnalyticsRow;
  data: CategoriesAnalyticsData;
  expanded: boolean;
  onToggle: () => void;
  txType?: "expense" | "income";
}) {
  const txUrl = buildCategoryTransactionsUrl({
    categoryId: row.id,
    period: data.period,
    txType: txType ?? (row.type === "income" ? "income" : "expense"),
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/categories/${row.id}`} className="font-semibold text-slate-900">
            {row.name}
          </Link>
          <div className="mt-1">
            <CategoryTypeBadge type={row.type} />
          </div>
        </div>
        <Link href={txUrl} className="text-lg font-bold text-slate-900">
          {formatPln(row.totalPln)}
        </Link>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{row.txCount} transakcji · {formatPercent(row.sharePct)}</span>
        <span className={trendClass(row.trendDelta)}>
          {trendLabel(row.trendDelta, row.trendPct)}
        </span>
      </div>
      {row.budgetLimit != null && data.tab !== "income" && (
        <div className="mt-3">
          <CategoryBudgetBar
            spent={row.totalPln}
            limit={row.budgetLimit}
            categoryId={row.id}
            budgetYear={data.period.budgetYear}
            budgetMonth={data.period.budgetMonth}
          />
        </div>
      )}
      {row.subcategories.length > 0 && (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="mt-3 text-xs font-medium text-primary"
          >
            {expanded ? "Zwiń podkategorie" : `${row.subcategories.length} podkategorii`}
          </button>
          {expanded && (
            <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2 text-xs">
              {row.subcategories.map((sub) => (
                <li key={sub.id} className="flex justify-between">
                  <span>{sub.name}</span>
                  <Link
                    href={buildCategoryTransactionsUrl({
                      categoryId: row.id,
                      subcategoryId: sub.id,
                      period: data.period,
                      txType: txType ?? "expense",
                    })}
                    className="font-medium"
                  >
                    {formatPln(sub.totalPln)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
