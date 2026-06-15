import Link from "next/link";
import type { BudgetBreakdownRow, BudgetBreakdownTotals } from "@/lib/dashboard/budget-metrics";
import { completionStatusClass } from "@/lib/dashboard/budget-metrics";
import { formatPln, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SectionCard } from "@/components/layout";
import { DashboardSectionHeader } from "@/components/dashboard/dashboard-section-header";

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
      <DashboardSectionHeader title={title} />

      <BreakdownSection
        title="Przychody"
        accent="income"
        rows={incomeRows}
        totals={incomeTotals}
        isExpense={false}
        periodFrom={periodFrom}
        periodTo={periodTo}
      />
      <BreakdownSection
        title="Wydatki"
        accent="expense"
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
  accent,
  rows,
  totals,
  isExpense,
  periodFrom,
  periodTo,
}: {
  title: string;
  accent: "income" | "expense";
  rows: BudgetBreakdownRow[];
  totals: BudgetBreakdownTotals;
  isExpense: boolean;
  periodFrom: string;
  periodTo: string;
}) {
  const txType = isExpense ? "expense" : "income";
  const headerClass =
    accent === "income"
      ? "border-emerald-100 bg-emerald-50/70 text-emerald-800"
      : "border-rose-100 bg-rose-50/70 text-rose-800";

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className={cn("border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide", headerClass)}>
        {title}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          Brak {isExpense ? "wydatków" : "przychodów"} w tym okresie
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-[11px] font-medium uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5">Kategoria</th>
                <th className="px-3 py-2.5 text-right">Wykonanie</th>
                <th className="px-3 py-2.5 text-right">Budżet</th>
                <th className="px-3 py-2.5 text-right">% wyk.</th>
                <th className="px-3 py-2.5 text-right">Pozostało</th>
                <th className="px-4 py-2.5 text-right">
                  {isExpense ? "Przekroczenie" : "Nadwyżka"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {rows.map((row) => (
                <BreakdownRow
                  key={row.categoryId}
                  row={row}
                  isExpense={isExpense}
                  href={
                    row.categoryId === "__uncategorized__"
                      ? `/transactions?type=${txType}&period=custom&from=${periodFrom}&to=${periodTo}`
                      : `/transactions?type=${txType}&category=${row.categoryId}&period=custom&from=${periodFrom}&to=${periodTo}`
                  }
                />
              ))}
              <tr className="bg-slate-50/80 text-[13px] font-semibold text-slate-900">
                <td className="px-4 py-3">Razem</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatPln(totals.tracked)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {totals.budget != null ? formatPln(totals.budget) : "—"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {totals.completionPct != null ? formatPercent(totals.completionPct) : "—"}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                  {totals.remaining != null ? formatPln(totals.remaining) : "—"}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right tabular-nums",
                    totals.excess > 0
                      ? isExpense
                        ? "text-rose-600"
                        : "text-emerald-600"
                      : "text-muted-foreground"
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
    <tr className="transition-colors hover:bg-slate-50/60">
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Link
            href={href}
            className="font-medium text-slate-800 hover:text-slate-950 hover:underline"
          >
            {row.categoryName}
          </Link>
          {row.categoryId !== "__uncategorized__" && row.budget == null && row.tracked > 0 && (
            <Link
              href="/budgets"
              className="text-[11px] text-slate-400 hover:text-slate-600"
            >
              Ustaw budżet
            </Link>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-800">
        {formatPln(row.tracked)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
        {row.budget != null ? formatPln(row.budget) : "—"}
      </td>
      <td
        className={cn(
          "px-3 py-2.5 text-right tabular-nums",
          status === "over" && "bg-rose-50/80 text-rose-700",
          status === "warn" && "bg-amber-50/80 text-amber-800",
          status === "ok" && "text-emerald-700",
          status === "none" && "text-muted-foreground"
        )}
      >
        {row.completionPct != null ? formatPercent(row.completionPct) : "—"}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
        {row.remaining != null ? formatPln(row.remaining) : "—"}
      </td>
      <td
        className={cn(
          "px-4 py-2.5 text-right tabular-nums",
          row.excess > 0
            ? isExpense
              ? "font-medium text-rose-600"
              : "font-medium text-emerald-600"
            : "text-muted-foreground"
        )}
      >
        {row.excess > 0 ? formatPln(row.excess) : formatPln(0)}
      </td>
    </tr>
  );
}
