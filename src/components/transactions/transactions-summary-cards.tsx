import { ArrowDownLeft, ArrowUpRight, Hash, Scale } from "lucide-react";
import { SummaryCard, SummaryCardGrid } from "@/components/layout";
import type { TransactionSummary } from "@/lib/queries/transaction-summary";
import { formatPln } from "@/lib/format";

interface TransactionsSummaryCardsProps {
  summary: TransactionSummary;
}

export function TransactionsSummaryCards({ summary }: TransactionsSummaryCardsProps) {
  const balanceTone =
    summary.balance > 0 ? "positive" : summary.balance < 0 ? "negative" : "neutral";

  return (
    <SummaryCardGrid cols={4}>
      <SummaryCard
        label="Przychody"
        value={formatPln(summary.incomeTotal)}
        sub={summary.maxIncome > 0 ? `max ${formatPln(summary.maxIncome)}` : null}
        icon={ArrowDownLeft}
        tone="positive"
        mutedValue={summary.incomeTotal === 0}
      />
      <SummaryCard
        label="Wydatki"
        value={formatPln(summary.expenseTotal)}
        sub={summary.maxExpense > 0 ? `max ${formatPln(summary.maxExpense)}` : null}
        icon={ArrowUpRight}
        tone="negative"
        mutedValue={summary.expenseTotal === 0}
      />
      <SummaryCard
        label="Saldo okresu"
        value={formatPln(summary.balance)}
        icon={Scale}
        tone={balanceTone}
        mutedValue={summary.balance === 0}
      />
      <SummaryCard
        label="Transakcje"
        value={summary.txCount.toLocaleString("pl-PL")}
        icon={Hash}
        tone="neutral"
      />
    </SummaryCardGrid>
  );
}
