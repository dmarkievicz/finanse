import { ArrowDownLeft, ArrowUpRight, Hash, Scale } from "lucide-react";
import type { TransactionSummary } from "@/lib/queries/transaction-summary";
import { formatPln } from "@/lib/format";

interface TransactionsSummaryCardsProps {
  summary: TransactionSummary;
}

export function TransactionsSummaryCards({ summary }: TransactionsSummaryCardsProps) {
  const cards = [
    {
      label: "Przychody",
      value: formatPln(summary.incomeTotal),
      sub: summary.maxIncome > 0 ? `max ${formatPln(summary.maxIncome)}` : null,
      icon: ArrowDownLeft,
      className: "text-emerald-700",
      bg: "bg-emerald-50",
    },
    {
      label: "Wydatki",
      value: formatPln(summary.expenseTotal),
      sub: summary.maxExpense > 0 ? `max ${formatPln(summary.maxExpense)}` : null,
      icon: ArrowUpRight,
      className: "text-red-700",
      bg: "bg-red-50",
    },
    {
      label: "Saldo okresu",
      value: formatPln(summary.balance),
      sub: null,
      icon: Scale,
      className: summary.balance >= 0 ? "text-emerald-700" : "text-red-700",
      bg: summary.balance >= 0 ? "bg-emerald-50/60" : "bg-red-50/60",
    },
    {
      label: "Transakcje",
      value: summary.txCount.toLocaleString("pl-PL"),
      sub: null,
      icon: Hash,
      className: "text-foreground",
      bg: "bg-slate-50",
    },
  ];

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium text-muted">{c.label}</p>
              <p className={`mt-1 text-xl font-bold tabular-nums ${c.className}`}>
                {c.value}
              </p>
              {c.sub && <p className="mt-0.5 text-xs text-muted">{c.sub}</p>}
            </div>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.bg}`}>
              <c.icon className={`h-4 w-4 ${c.className}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
