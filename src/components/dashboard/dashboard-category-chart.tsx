import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import type { CategorySlice } from "@/lib/queries/dashboard";
import { formatPln } from "@/lib/format";

interface DashboardCategoryChartProps {
  categories: CategorySlice[];
  total: number;
  periodFrom: string;
  periodTo: string;
}

export function DashboardCategoryChart({
  categories,
  total,
  periodFrom,
  periodTo,
}: DashboardCategoryChartProps) {
  if (total === 0 || categories.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-semibold text-foreground">Wydatki według kategorii</h3>
        <p className="mt-1 text-xs text-muted">Top 5 kategorii w wybranym okresie</p>
        <div className="mt-6 flex h-32 items-center justify-center rounded-xl bg-slate-50 text-sm text-muted">
          Brak wydatków w tym okresie
        </div>
      </div>
    );
  }

  const gradient = categories
    .reduce<{ parts: string[]; acc: number }>(
      (state, c) => {
        const start = state.acc;
        const end = state.acc + c.pct;
        state.parts.push(`${c.color} ${start}% ${end}%`);
        state.acc = end;
        return state;
      },
      { parts: [], acc: 0 }
    )
    .parts.join(", ");

  const showDonut = categories.length >= 2;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Wydatki według kategorii</h3>
          <p className="text-xs text-muted">
            Top {Math.min(5, categories.length)} · łącznie {formatPln(total)}
          </p>
        </div>
        <Link
          href={`/transactions?type=expense&period=custom&from=${periodFrom}&to=${periodTo}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Wszystkie
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {showDonut && (
          <div
            className="relative mx-auto h-28 w-28 shrink-0 rounded-full"
            style={{ background: `conic-gradient(${gradient})` }}
            role="img"
            aria-label="Wykres donut kategorii wydatków"
          >
            <div className="absolute inset-3 flex items-center justify-center rounded-full bg-card text-center">
              <span className="text-[10px] font-semibold leading-tight text-muted">
                {categories.length}
                <br />
                kat.
              </span>
            </div>
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          {categories.map((c) => (
            <Link
              key={c.name}
              href={
                c.categoryId
                  ? `/transactions?type=expense&category=${c.categoryId}&period=custom&from=${periodFrom}&to=${periodTo}`
                  : `/transactions?type=expense&period=custom&from=${periodFrom}&to=${periodTo}`
              }
              className="block rounded-lg px-2 py-1.5 hover:bg-slate-50"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="truncate font-medium">{c.name}</span>
                </span>
                <span className="shrink-0 tabular-nums font-semibold">{formatPln(c.total)}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${c.pct}%`, backgroundColor: c.color }}
                  />
                </div>
                <span className="w-10 text-right text-[11px] tabular-nums text-muted">
                  {c.pct}%
                </span>
                {c.trendPct != null && (
                  <span
                    className={`inline-flex items-center gap-0.5 text-[11px] ${
                      c.trendPct <= 0 ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {c.trendPct <= 0 ? (
                      <TrendingDown className="h-3 w-3" />
                    ) : (
                      <TrendingUp className="h-3 w-3" />
                    )}
                    {c.trendPct > 0 ? "+" : ""}
                    {c.trendPct}%
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
