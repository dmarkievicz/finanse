import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { fetchCategoryDetail } from "@/lib/queries/categories";
import { formatDate, formatPln } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CategoryDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const data = await fetchCategoryDetail(supabase, id);

  if (!data) notFound();

  const maxTrend = Math.max(...data.monthlyTrend.map((m) => m.total), 1);

  return (
    <div>
      <PageHeader
        title={data.name}
        description={`${data.type} · bieżący miesiąc: ${formatPln(data.currentMonthSpent)} (${data.currentMonthTxCount} transakcji)`}
      />

      <Link
        href="/categories"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wszystkie kategorie
      </Link>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted">Trend 12 miesięcy</h3>
          <div className="mt-4 space-y-2">
            {data.monthlyTrend.map((m) => (
              <div key={m.month} className="flex items-center gap-2 text-xs">
                <span className="w-12 shrink-0 text-muted">{m.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{ width: `${(m.total / maxTrend) * 100}%` }}
                  />
                </div>
                <span className="w-20 text-right font-medium">{formatPln(m.total)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted">Największe transakcje (ten miesiąc)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {data.topTransactions.length === 0 ? (
              <li className="text-muted">Brak wydatków w tym miesiącu</li>
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
          <Link
            href={`/transactions?category=${data.id}&month=${new Date().toISOString().slice(0, 7)}`}
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            Wszystkie transakcje kategorii →
          </Link>
        </div>
      </div>
    </div>
  );
}
