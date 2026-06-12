import { Database, FileSpreadsheet, Tags, Wallet } from "lucide-react";
import { SummaryCard, SummaryCardGrid } from "@/components/layout";

interface ImportStatsProps {
  transactions: number;
  accounts: number;
  categories: number;
  importRows: number;
}

export function ImportStats({ transactions, accounts, categories, importRows }: ImportStatsProps) {
  return (
    <SummaryCardGrid cols={4}>
      <SummaryCard
        label="Transakcje"
        value={transactions.toLocaleString("pl-PL")}
        icon={FileSpreadsheet}
        tone="primary"
      />
      <SummaryCard
        label="Konta"
        value={accounts.toLocaleString("pl-PL")}
        icon={Wallet}
        tone="info"
      />
      <SummaryCard
        label="Kategorie"
        value={categories.toLocaleString("pl-PL")}
        icon={Tags}
        tone="neutral"
      />
      <SummaryCard
        label="Wiersze importu"
        value={importRows.toLocaleString("pl-PL")}
        icon={Database}
        tone="neutral"
      />
    </SummaryCardGrid>
  );
}
