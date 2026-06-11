import { Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { formatPln } from "@/lib/format";
import type { AccountRow } from "@/lib/queries/accounts";

interface AccountsSummaryProps {
  accounts: AccountRow[];
  netWorth: number;
  asOfDate: string;
}

export function AccountsSummary({ accounts, netWorth, asOfDate }: AccountsSummaryProps) {
  const positive = accounts.filter((a) => a.balance > 0);
  const negative = accounts.filter((a) => a.balance < 0);
  const totalPositive = positive.reduce((s, a) => s + a.balance, 0);
  const totalNegative = negative.reduce((s, a) => s + a.balance, 0);

  const cards = [
    {
      label: "Majątek netto",
      value: formatPln(netWorth),
      sub: `stan na ${asOfDate}`,
      icon: Wallet,
      accent: "text-primary bg-primary/10",
    },
    {
      label: "Konta",
      value: String(accounts.length),
      sub: `${positive.length} dodatnich · ${negative.length} ujemnych`,
      icon: Landmark,
      accent: "text-blue-600 bg-blue-50",
    },
    {
      label: "Suma dodatnich",
      value: formatPln(totalPositive),
      sub: "aktywa",
      icon: TrendingUp,
      accent: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "Suma ujemnych",
      value: formatPln(totalNegative),
      sub: "zobowiązania",
      icon: TrendingDown,
      accent: "text-red-600 bg-red-50",
    },
  ];

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.accent}`}>
              <c.icon className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-sm text-muted">{c.label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{c.value}</p>
          <p className="mt-0.5 text-xs text-muted">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
