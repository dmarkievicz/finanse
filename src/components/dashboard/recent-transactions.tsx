import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import type { RecentTransactionRow } from "@/lib/queries/dashboard";
import { formatDate } from "@/lib/format";

interface RecentTransactionsProps {
  transactions: RecentTransactionRow[];
}

const typeConfig = {
  income: { icon: ArrowDownLeft, color: "text-emerald-600 bg-emerald-50", label: "Przychód" },
  expense: { icon: ArrowUpRight, color: "text-red-600 bg-red-50", label: "Wydatek" },
  transfer: { icon: ArrowLeftRight, color: "text-blue-600 bg-blue-50", label: "Transfer" },
  exchange: { icon: ArrowLeftRight, color: "text-violet-600 bg-violet-50", label: "Wymiana" },
  adjustment: { icon: ArrowLeftRight, color: "text-slate-600 bg-slate-50", label: "Korekta" },
};

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Ostatnie transakcje</h3>
          <p className="text-xs text-muted">5 najnowszych wpisów</p>
        </div>
        <Link href="/transactions" className="text-xs font-medium text-accent hover:underline">
          Zobacz wszystkie →
        </Link>
      </div>
      {transactions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Brak transakcji</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th className="pb-2 font-medium">Data</th>
                <th className="pb-2 font-medium">Typ</th>
                <th className="pb-2 font-medium">Kategoria</th>
                <th className="pb-2 font-medium text-right">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => {
                const cfg = typeConfig[t.type] ?? typeConfig.adjustment;
                const Icon = cfg.icon;
                const isReview = t.status === "needs_review";

                return (
                  <tr
                    key={t.id}
                    className={`border-b border-border/60 last:border-0 ${isReview ? "bg-red-50/50" : ""}`}
                  >
                    <td className="py-2.5 text-muted">{formatDate(t.date)}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${cfg.color}`}
                      >
                        <Icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="py-2.5 text-foreground">
                      {t.category}
                      {isReview && (
                        <span className="ml-1.5 text-[10px] font-medium text-red-600">do poprawy</span>
                      )}
                    </td>
                    <td
                      className={`py-2.5 text-right font-medium ${
                        t.type === "income"
                          ? "text-emerald-600"
                          : t.type === "expense"
                            ? "text-red-600"
                            : "text-foreground"
                      }`}
                    >
                      {t.amountLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
