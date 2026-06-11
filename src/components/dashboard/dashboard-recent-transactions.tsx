import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RecentTransactionRow } from "@/lib/queries/dashboard";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DashboardRecentTransactionsProps {
  transactions: RecentTransactionRow[];
}

const typeBadge: Record<string, string> = {
  income: "bg-emerald-50 text-emerald-700",
  expense: "bg-red-50 text-red-700",
  transfer: "bg-sky-50 text-sky-700",
  exchange: "bg-violet-50 text-violet-700",
  adjustment: "bg-slate-100 text-slate-700",
};

const typeLabel: Record<string, string> = {
  income: "Przychód",
  expense: "Wydatek",
  transfer: "Transfer",
  exchange: "Wymiana",
  adjustment: "Korekta",
};

export function DashboardRecentTransactions({ transactions }: DashboardRecentTransactionsProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Ostatnie transakcje</h3>
          <p className="text-xs text-muted">Bez pozycji wymagających poprawy</p>
        </div>
        <Link
          href="/transactions"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Wszystkie
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-xl bg-slate-50 py-8 text-center text-sm text-muted">
          Brak ostatnich transakcji
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="pb-2 pr-3 font-medium">Data</th>
                <th className="pb-2 pr-3 font-medium">Typ</th>
                <th className="pb-2 pr-3 font-medium">Kategoria</th>
                <th className="hidden pb-2 pr-3 font-medium sm:table-cell">Konto</th>
                <th className="pb-2 text-right font-medium">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 pr-3">
                    <Link href={`/transactions/${tx.id}`} className="hover:text-primary">
                      {formatDate(tx.date)}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3">
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                        typeBadge[tx.type] ?? "bg-slate-100"
                      )}
                    >
                      {typeLabel[tx.type] ?? tx.type}
                    </span>
                  </td>
                  <td className="max-w-[120px] truncate py-2.5 pr-3 text-muted">{tx.category}</td>
                  <td className="hidden max-w-[140px] truncate py-2.5 pr-3 text-muted sm:table-cell">
                    {tx.account}
                  </td>
                  <td className="py-2.5 text-right font-medium tabular-nums">{tx.amountLabel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
