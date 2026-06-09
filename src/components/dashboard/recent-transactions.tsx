import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";

const transactions = [
  { date: "31.03.2026", type: "expense" as const, category: "Spożywcze", amount: "-245,00 zł", account: "mBank PLN" },
  { date: "30.03.2026", type: "income" as const, category: "Pensja - D", amount: "+18 450,00 zł", account: "mBank PLN" },
  { date: "29.03.2026", type: "transfer" as const, category: "Transfer", amount: "5 000,00 zł", account: "→ LOKATY PLN" },
  { date: "28.03.2026", type: "expense" as const, category: "Tipple", amount: "-89,00 zł", account: "Portfel PLN" },
  { date: "27.03.2026", type: "expense" as const, category: "Rachunki", amount: "-320,00 zł", account: "mBank PLN" },
];

const typeConfig = {
  income: { icon: ArrowDownLeft, color: "text-emerald-600 bg-emerald-50", label: "Przychód" },
  expense: { icon: ArrowUpRight, color: "text-red-600 bg-red-50", label: "Wydatek" },
  transfer: { icon: ArrowLeftRight, color: "text-blue-600 bg-blue-50", label: "Transfer" },
};

export function RecentTransactions() {
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
            {transactions.map((t, i) => {
              const cfg = typeConfig[t.type];
              const Icon = cfg.icon;
              return (
                <tr key={i} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5 text-muted">{t.date}</td>
                  <td className="py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-2.5 text-foreground">{t.category}</td>
                  <td className={`py-2.5 text-right font-medium ${t.type === "income" ? "text-emerald-600" : t.type === "expense" ? "text-red-600" : "text-foreground"}`}>
                    {t.amount}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
