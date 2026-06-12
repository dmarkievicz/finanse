import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RecentTransactionRow } from "@/lib/queries/dashboard";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DashboardEmpty,
  DashboardPanel,
  DashboardPanelHeader,
  dashboardLink,
} from "@/components/dashboard/dashboard-ui";

interface DashboardRecentTransactionsProps {
  transactions: RecentTransactionRow[];
}

const typeLabel: Record<string, string> = {
  income: "Przychód",
  expense: "Wydatek",
  transfer: "Transfer",
  exchange: "Wymiana",
  adjustment: "Korekta",
};

const MAX_ROWS = 7;

export function DashboardRecentTransactions({ transactions }: DashboardRecentTransactionsProps) {
  const rows = transactions.slice(0, MAX_ROWS);

  return (
    <DashboardPanel className="h-full">
      <DashboardPanelHeader
        title="Ostatnie transakcje"
        subtitle="Najnowsze potwierdzone"
        action={
          <Link href="/transactions" className={`inline-flex items-center gap-1 ${dashboardLink}`}>
            Zobacz wszystkie
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {rows.length === 0 ? (
        <DashboardEmpty>Brak transakcji</DashboardEmpty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] text-slate-400">
                <th className="pb-2 pr-2 font-medium">Data</th>
                <th className="hidden pb-2 pr-2 font-medium sm:table-cell">Kategoria</th>
                <th className="hidden pb-2 pr-2 font-medium md:table-cell">Konto</th>
                <th className="pb-2 text-right font-medium">Kwota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((tx) => (
                <tr key={tx.id} className="group">
                  <td className="py-2.5 pr-2">
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="text-[13px] text-slate-600 hover:text-slate-900"
                    >
                      <span className="block">{formatDate(tx.date)}</span>
                      <span className="text-[11px] text-slate-400 sm:hidden">
                        {typeLabel[tx.type] ?? tx.type}
                      </span>
                    </Link>
                  </td>
                  <td className="hidden max-w-[120px] truncate py-2.5 pr-2 text-[12px] text-slate-600 sm:table-cell">
                    {tx.category}
                  </td>
                  <td className="hidden max-w-[100px] truncate py-2.5 pr-2 text-[12px] text-slate-400 md:table-cell">
                    {tx.account}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 text-right text-[13px] font-semibold tabular-nums",
                      tx.type === "income"
                        ? "text-emerald-600"
                        : tx.type === "expense"
                          ? "text-rose-500"
                          : "text-slate-800"
                    )}
                  >
                    {tx.amountLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardPanel>
  );
}
