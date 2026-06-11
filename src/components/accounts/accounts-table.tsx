import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import type { AccountRow } from "@/lib/queries/accounts";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import type { AccountType } from "@/types/database";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountsTableProps {
  accounts: AccountRow[];
  showZeroBalances?: boolean;
}

const typeBadgeStyles: Record<AccountType, string> = {
  bank: "bg-blue-50 text-blue-700",
  cash: "bg-emerald-50 text-emerald-700",
  broker: "bg-violet-50 text-violet-700",
  deposit: "bg-amber-50 text-amber-700",
  investment: "bg-teal-50 text-teal-700",
  loan: "bg-red-50 text-red-700",
  real_estate: "bg-slate-100 text-slate-700",
  other: "bg-slate-50 text-slate-600",
};

export function AccountsTable({ accounts, showZeroBalances = true }: AccountsTableProps) {
  const visible = showZeroBalances ? accounts : accounts.filter((a) => a.balance !== 0);

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
        Brak kont do wyświetlenia
      </div>
    );
  }

  const maxAbs = Math.max(...visible.map((a) => Math.abs(a.balance)), 1);

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Konto</th>
              <th className="px-4 py-3 font-medium">Typ</th>
              <th className="px-4 py-3 font-medium">Waluta</th>
              <th className="px-4 py-3 font-medium">Udział</th>
              <th className="px-4 py-3 text-right font-medium">Saldo (PLN)</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => (
              <tr
                key={a.account_id}
                className="border-b border-border/60 last:border-0 hover:bg-slate-50/50"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <Link
                      href={`/accounts/${a.account_id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {a.account_name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      typeBadgeStyles[a.account_type as AccountType] ?? typeBadgeStyles.other
                    )}
                  >
                    {ACCOUNT_TYPE_LABELS[a.account_type as AccountType] ?? a.account_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{a.currency}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                        style={{ width: `${(Math.abs(a.balance) / maxAbs) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap px-4 py-3 text-right font-semibold",
                    a.balance < 0 ? "text-red-600" : a.balance > 0 ? "text-foreground" : "text-muted"
                  )}
                >
                  {formatPln(a.balance)}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/transactions?account=${a.account_id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                  >
                    Transakcje
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
