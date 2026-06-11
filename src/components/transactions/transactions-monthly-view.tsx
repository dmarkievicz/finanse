import Link from "next/link";
import type { DailyBreakdownRow } from "@/lib/queries/transaction-summary";
import { formatDate, formatPln } from "@/lib/format";
import {
  buildTransactionsUrl,
  type TransactionFilterState,
} from "@/lib/transactions/filter-state";

interface TransactionsMonthlyViewProps {
  days: DailyBreakdownRow[];
  filterState: TransactionFilterState;
}

export function TransactionsMonthlyView({
  days,
  filterState,
}: TransactionsMonthlyViewProps) {
  if (!days.length) {
    return (
      <p className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        Brak danych dla wybranego okresu
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-slate-50/80 text-left text-xs text-muted">
            <th className="px-4 py-3 font-medium">Dzień</th>
            <th className="px-4 py-3 text-right font-medium">Przychody</th>
            <th className="px-4 py-3 text-right font-medium">Wydatki</th>
            <th className="px-4 py-3 text-right font-medium">Saldo</th>
            <th className="px-4 py-3 text-right font-medium">Liczba</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const balance = d.incomePln - d.expensePln;
            return (
              <tr key={d.day} className="border-b border-border/60 hover:bg-slate-50/50">
                <td className="px-4 py-3 font-medium">{formatDate(d.day)}</td>
                <td className="px-4 py-3 text-right text-emerald-600 tabular-nums">
                  {d.incomePln > 0 ? formatPln(d.incomePln) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-red-600 tabular-nums">
                  {d.expensePln > 0 ? formatPln(d.expensePln) : "—"}
                </td>
                <td
                  className={`px-4 py-3 text-right font-medium tabular-nums ${
                    balance >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {formatPln(balance)}
                </td>
                <td className="px-4 py-3 text-right text-muted">{d.txCount}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={buildTransactionsUrl(filterState, {
                      day: d.day,
                      view: "grouped",
                      page: 1,
                    })}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Pokaż transakcje
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
