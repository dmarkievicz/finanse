import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import type { TransactionListItem } from "@/lib/queries/transactions";
import {
  buildTransactionsPageUrl,
  type TransactionFilterState,
} from "@/components/transactions/transactions-filters";
import { formatDate, formatPlnSigned } from "@/lib/format";

interface TransactionsTableProps {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
  filterState: TransactionFilterState;
}

const typeConfig = {
  income: { icon: ArrowDownLeft, color: "text-emerald-600 bg-emerald-50", label: "Przychód" },
  expense: { icon: ArrowUpRight, color: "text-red-600 bg-red-50", label: "Wydatek" },
  transfer: { icon: ArrowLeftRight, color: "text-blue-600 bg-blue-50", label: "Transfer" },
  exchange: { icon: ArrowLeftRight, color: "text-violet-600 bg-violet-50", label: "Wymiana" },
  adjustment: { icon: ArrowLeftRight, color: "text-slate-600 bg-slate-50", label: "Korekta" },
};

export function TransactionsTable({
  items,
  total,
  page,
  pageSize,
  filterState,
}: TransactionsTableProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">Kategoria</th>
              <th className="px-4 py-3 font-medium">Konto</th>
              <th className="px-4 py-3 font-medium">Szczegóły</th>
              <th className="px-4 py-3 text-right font-medium">Kwota PLN</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-muted">
                  Brak transakcji dla wybranych filtrów
                </td>
              </tr>
            ) : (
              items.map((t) => {
                const cfg = typeConfig[t.type] ?? typeConfig.adjustment;
                const Icon = cfg.icon;
                const isReview = t.status === "needs_review";
                const displayAmount = t.amountPln ?? t.pendingAmountPln;
                const amountPending = t.amountPln == null && t.pendingAmountPln != null;
                const amount =
                  t.type === "transfer" && displayAmount != null
                    ? formatPlnSigned(displayAmount).replace("+", "")
                    : formatPlnSigned(displayAmount);
                const account =
                  t.accountLabel !== "—" ? t.accountLabel : (t.pendingAccountLabel ?? "—");

                return (
                  <tr
                    key={t.id}
                    className={`border-b border-border/60 last:border-0 ${isReview ? "bg-red-50/60" : "hover:bg-slate-50/50"}`}
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      <Link href={`/transactions/${t.id}`} className="hover:text-primary hover:underline">
                        {formatDate(t.date)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cfg.color}`}
                      >
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                      {isReview && (
                        <span className="ml-1.5 text-[10px] font-semibold uppercase text-red-600">
                          do poprawy
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {t.category ?? "—"}
                      {t.subcategory && (
                        <span className="block text-xs text-muted">{t.subcategory}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{account}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-muted" title={t.details ?? ""}>
                      {t.details || t.reviewMessage || "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-medium ${
                        amountPending ? "text-amber-700" : t.type === "income"
                          ? "text-emerald-600"
                          : t.type === "expense"
                            ? "text-red-600"
                            : "text-foreground"
                      }`}
                      title={amountPending ? "Kwota z Excela — brak wpisu księgowego do poprawy" : undefined}
                    >
                      {amount}
                      {amountPending && (
                        <span className="ml-1 text-[10px] font-normal text-amber-600">excel</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          {total.toLocaleString("pl-PL")} transakcji · strona {page} z {totalPages}
        </p>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={buildTransactionsPageUrl(filterState, page - 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              ← Poprzednia
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={buildTransactionsPageUrl(filterState, page + 1)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
            >
              Następna →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
