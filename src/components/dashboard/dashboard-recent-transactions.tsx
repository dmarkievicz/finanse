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

export function DashboardRecentTransactions({ transactions }: DashboardRecentTransactionsProps) {
  return (
    <DashboardPanel>
      <DashboardPanelHeader
        title="Ostatnie transakcje"
        subtitle="Potwierdzone"
        action={
          <Link href="/transactions" className={`inline-flex items-center gap-1 ${dashboardLink}`}>
            Wszystkie
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      {transactions.length === 0 ? (
        <DashboardEmpty>Brak transakcji</DashboardEmpty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[11px] text-slate-400">
                <th className="pb-2 pr-3 font-medium">Data</th>
                <th className="pb-2 pr-3 font-medium">Typ</th>
                <th className="hidden pb-2 pr-3 font-medium sm:table-cell">Konto</th>
                <th className="pb-2 text-right font-medium">Kwota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((tx) => (
                <tr key={tx.id} className="group">
                  <td className="py-2.5 pr-3 text-[13px] text-slate-600">
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="hover:text-slate-900"
                    >
                      {formatDate(tx.date)}
                    </Link>
                  </td>
                  <td className="py-2.5 pr-3 text-[12px] text-slate-500">
                    {typeLabel[tx.type] ?? tx.type}
                  </td>
                  <td className="hidden max-w-[140px] truncate py-2.5 pr-3 text-[12px] text-slate-400 sm:table-cell">
                    {tx.account}
                  </td>
                  <td
                    className={cn(
                      "py-2.5 text-right text-[13px] font-medium tabular-nums",
                      tx.type === "income" ? "text-emerald-600" : "text-slate-800"
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
