import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import {
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPE_ORDER,
  type AccountRow,
} from "@/lib/queries/accounts";
import type { AccountType } from "@/types/database";
import { formatAccountBalance, formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountsGroupedTableProps {
  byType: Record<AccountType, AccountRow[]>;
  showZeroBalances?: boolean;
}

const typeHeaderStyles: Record<AccountType, string> = {
  bank: "border-blue-200 bg-blue-50/80 text-blue-900",
  cash: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
  credit_card: "border-orange-200 bg-orange-50/80 text-orange-900",
  broker: "border-violet-200 bg-violet-50/80 text-violet-900",
  deposit: "border-amber-200 bg-amber-50/80 text-amber-900",
  investment: "border-teal-200 bg-teal-50/80 text-teal-900",
  loan: "border-red-200 bg-red-50/80 text-red-900",
  real_estate: "border-slate-200 bg-slate-100/80 text-slate-800",
  other: "border-slate-200 bg-slate-50/80 text-slate-700",
};

export function AccountsGroupedTable({ byType, showZeroBalances = true }: AccountsGroupedTableProps) {
  const groups = ACCOUNT_TYPE_ORDER.map((type) => {
    const items = showZeroBalances
      ? byType[type]
      : byType[type].filter((a) => a.balance !== 0);
    const total = items.reduce((s, a) => s + a.balance, 0);
    return { type, items, total };
  }).filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        <p>Brak kont do wyświetlenia.</p>
        <Link href="/accounts/new" className="mt-2 inline-block font-medium text-accent hover:underline">
          Dodaj pierwsze konto →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map(({ type, items, total }) => (
        <section key={type} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3",
              typeHeaderStyles[type]
            )}
          >
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 opacity-70" />
              <h3 className="font-semibold">{ACCOUNT_TYPE_LABELS[type]}</h3>
              <span className="text-xs opacity-70">({items.length})</span>
            </div>
            <span className="text-sm font-semibold">{formatPln(total)}</span>
          </div>
          <ul className="divide-y divide-border/60">
            {items.map((a) => (
              <li
                key={a.account_id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/50"
              >
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/accounts/${a.account_id}`}
                    className="font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {a.account_name}
                  </Link>
                  <p className="text-xs text-muted">{a.currency}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      a.balance < 0 ? "text-red-600" : a.balance > 0 ? "text-foreground" : "text-muted"
                    )}
                  >
                    {formatAccountBalance(a.balance_native, a.currency, a.balance)}
                  </span>
                  <Link
                    href={`/transactions?account=${a.account_id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                  >
                    Transakcje
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
