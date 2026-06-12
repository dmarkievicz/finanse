import Link from "next/link";
import type { BudgetBreakdownRow, BudgetBreakdownTotals } from "@/lib/dashboard/budget-metrics";
import { completionStatusClass } from "@/lib/dashboard/budget-metrics";
import { formatPln, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/layout";

interface BudgetBreakdownTableProps {
  title: string;
  incomeRows: BudgetBreakdownRow[];
  incomeTotals: BudgetBreakdownTotals;
  expenseRows: BudgetBreakdownRow[];
  expenseTotals: BudgetBreakdownTotals;
  periodFrom: string;
  periodTo: string;
}

export function BudgetBreakdownTable({
  title,
  incomeRows,
  incomeTotals,
  expenseRows,
  expenseTotals,
  periodFrom,
  periodTo,
}: BudgetBreakdownTableProps) {
  return (
    <SectionCard padding="none" className="overflow-hidden">
      <div className="border-b border-slate-200 bg-[#1e3a5f] px-4 py-3">
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
      </div>

      <BreakdownSection
        title="Przychody"
        headerClass="bg-emerald-600"
        rows={incomeRows}
        totals={incomeTotals}
        isExpense={false}
        periodFrom={periodFrom}
        periodTo={periodTo}
      />
      <BreakdownSection
        title="Wydatki"
        headerClass="bg-rose-500"
        rows={expenseRows}
        totals={expenseTotals}
        isExpense
        periodFrom={periodFrom}
        periodTo={periodTo}
      />
    </SectionCard>
  );
}

function BreakdownSection({
  title,
  headerClass,
  rows,
  totals,
  isExpense,
  periodFrom,
  periodTo,
}: {
  title: string;
  headerClass: string;
  rows: BudgetBreakdownRow[];
  totals: BudgetBreakdownTotals;
  isExpense: boolean;
  periodFrom: string;
  periodTo: string;
}) {
  const txType = isExpense ? "expense" : "income";

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className={cn("px-4 py-2 text-[13px] font-semibold text-white", headerClass)}>
        {title}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-slate-500">
          Brak {isExpense ? "wydatków" : "przychodów"} w tym okresie
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-[11px] text-slate-500">
                <th className="px-4 py-2 font-medium">Kategoria</th>
                <th className="px-3 py-2 text-right font-medium">Wykonanie</th>
                <th className="px-3 py-2 text-right font-medium">Budżet</th>
                <th className="px-3 py-2 text-right font-medium">% wyk.</th>
                <th className="px-3 py-2 text-right font-medium">Pozostało</th>
                <th className="px-4 py-2 text-right font-medium">
                  {isExpense ? "Przekroczenie" : "Nadwyżka"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => (
                <BreakdownRow
                  key={row.categoryId}
                  row={row}
                  isExpense={isExpense}
                  href={`/transactions?type=${txType}&category=${row.categoryId}&period=custom&from=${periodFrom}&to=${periodTo}`}
                />
              ))}
              <tr className="bg-slate-50/60 font-semibold">
                <td className="px-4 py-2.5 text-slate-800">Razem</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatPln(totals.tracked)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {totals.budget != null ? formatPln(totals.budget) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {totals.completionPct != null ? formatPercent(totals.completionPct) : "—"}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {totals.remaining != null ? formatPln(totals.remaining) : "—"}
                </td>
                <td
                  className={cn(
                    "px-4 py-2.5 text-right tabular-nums",
                    isExpense ? "text-rose-600" : "text-emerald-600"
                  )}
                >
                  {totals.excess > 0 ? formatPln(totals.excess) : formatPln(0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BreakdownRow({
  row,
  isExpense,
  href,
}: {
  row: BudgetBreakdownRow;
  isExpense: boolean;
  href: string;
}) {
  const status = completionStatusClass(row.completionPct, isExpense);

  return (
    <tr className="hover:bg-slate-50/50">
      <td className="px-4 py-2">
        <Link href={href} className="font-medium text-slate-800 hover:text-[#1e3a5f]">
          {row.categoryName}
        </Link>
        {row.budget == null && row.tracked > 0 && (
          <Link
            href="/budgets"
            className="ml-2 text-[11px] text-slate-400 hover:text-slate-600"
          >
            Ustaw budżet
          </Link>
        )}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-800">
        {formatPln(row.tracked)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
        {row.budget != null ? formatPln(row.budget) : "—"}
      </td>
      <td
        className={cn(
          "px-3 py-2 text-right tabular-nums",
          status === "over" && "bg-rose-50 text-rose-700",
          status === "warn" && "bg-amber-50 text-amber-800",
          status === "ok" && "text-emerald-700",
          status === "none" && "text-slate-400"
        )}
      >
        {row.completionPct != null ? formatPercent(row.completionPct) : "—"}
      </td>
      <td className="px-3 py-2 text-right tabular-nums text-slate-600">
        {row.remaining != null ? formatPln(row.remaining) : "—"}
      </td>
      <td
        className={cn(
          "px-4 py-2 text-right tabular-nums",
          row.excess > 0
            ? isExpense
              ? "font-medium text-rose-600"
              : "font-medium text-emerald-600"
            : "text-slate-500"
        )}
      >
        {row.excess > 0 ? formatPln(row.excess) : formatPln(0)}
      </td>
    </tr>
  );
}
