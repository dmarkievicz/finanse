import { Database, FileSpreadsheet, Tags, Wallet } from "lucide-react";

interface ImportStatsProps {
  transactions: number;
  accounts: number;
  categories: number;
  importRows: number;
}

export function ImportStats({ transactions, accounts, categories, importRows }: ImportStatsProps) {
  const cards = [
    { label: "Transakcje", value: transactions, icon: FileSpreadsheet },
    { label: "Konta", value: accounts, icon: Wallet },
    { label: "Kategorie", value: categories, icon: Tags },
    { label: "Wiersze importu", value: importRows, icon: Database },
  ];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <c.icon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs text-muted">{c.label}</p>
              <p className="text-xl font-bold text-foreground">
                {c.value.toLocaleString("pl-PL")}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
