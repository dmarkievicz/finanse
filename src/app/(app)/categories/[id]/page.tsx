import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { parseCategoriesPeriod } from "@/lib/categories/period";
import { fetchCategoryDetailAnalytics } from "@/lib/queries/category-analytics";
import { CategoryTypeBadge } from "@/components/categories/category-type-badge";
import { CategoryBudgetBar } from "@/components/categories/category-budget-bar";
import { CategorySparkline } from "@/components/categories/category-sparkline";
import { buildCategoryTransactionsUrl } from "@/lib/categories/transactions-link";
import { trendClass, trendLabel } from "@/lib/categories/labels";
import { formatDate, formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function CategoryDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const period = parseCategoriesPeriod(sp);
  const data = await fetchCategoryDetailAnalytics(supabase, id, period);

  if (!data) notFound();

  const txType = data.type === "income" ? "income" : "expense";
  const txUrl = buildCategoryTransactionsUrl({
    categoryId: data.id,
    period,
    txType,
  });

  const sparkValues = data.monthlyTrend.map((m) => m.total);
  const maxTrend = Math.max(...sparkValues, 1);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link
        href="/categories"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wszystkie kategorie
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: data.color ?? "#94a3b8" }}
          />
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{data.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <CategoryTypeBadge type={data.type} />
              <span className="text-sm text-slate-500">{period.label}</span>
            </div>
          </div>
        </div>
        <Link
          href={txUrl}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <ExternalLink className="h-4 w-4" />
          Zobacz transakcje
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Suma w okresie</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{formatPln(data.totalPln)}</p>
          <p className="text-xs text-slate-500">{data.txCount} transakcji</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Zmiana vs poprzedni okres</p>
          <p className={cn("mt-1 text-lg font-semibold", trendClass(data.trendDelta))}>
            {trendLabel(data.trendDelta, data.trendPct)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Średnia 3 mies.</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {data.avg3m != null ? formatPln(data.avg3m) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium text-slate-500">Średnia 12 mies.</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {data.avg12m != null ? formatPln(data.avg12m) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Trend 12 miesięcy</h3>
            <CategorySparkline values={sparkValues} color={data.color ?? "#64748b"} />
          </div>
          <div className="mt-4 space-y-2">
            {data.monthlyTrend.map((m) => (
              <div key={m.month} className="flex items-center gap-2 text-xs">
                <span className="w-14 shrink-0 text-slate-500">{m.month}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-400"
                    style={{ width: `${(m.total / maxTrend) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right font-medium">{formatPln(m.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {data.type !== "income" && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">Budżet</h3>
              <div className="mt-3">
                <CategoryBudgetBar
                  spent={data.totalPln}
                  limit={data.budgetLimit}
                  categoryId={data.id}
                  budgetYear={period.budgetYear}
                  budgetMonth={period.budgetMonth}
                />
              </div>
            </div>
          )}

          {data.subcategories.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold text-slate-900">Podkategorie</h3>
              <ul className="mt-3 space-y-2 text-sm">
                {data.subcategories.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span>{s.name}</span>
                    <Link
                      href={buildCategoryTransactionsUrl({
                        categoryId: data.id,
                        subcategoryId: s.id,
                        period,
                        txType,
                      })}
                      className="font-medium hover:underline"
                    >
                      {formatPln(s.totalPln)} ({s.txCount})
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900">Ostatnie transakcje</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {data.topTransactions.length === 0 ? (
                <li className="text-slate-500">Brak transakcji w okresie</li>
              ) : (
                data.topTransactions.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2">
                    <Link href={`/transactions/${t.id}`} className="truncate hover:underline">
                      {formatDate(t.date)} — {t.details || "—"}
                    </Link>
                    <span className="shrink-0 font-medium">{formatPln(t.amount_pln)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
