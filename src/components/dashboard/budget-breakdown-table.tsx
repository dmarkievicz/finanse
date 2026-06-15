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

const NUM = "px-3 py-2.5 text-right align-middle tabular-nums whitespace-nowrap";
const TH_NUM =
  "px-3 py-2.5 text-right align-middle text-[11px] font-medium uppercase tracking-wide text-muted whitespace-nowrap";

function BreakdownColGroup() {
  return (
    <colgroup>
      <col />
      <col style={{ width: "7.25rem" }} />
      <col style={{ width: "7.25rem" }} />
      <col style={{ width: "4.75rem" }} />
      <col style={{ width: "7.25rem" }} />
      <col style={{ width: "7.75rem" }} />
    </colgroup>
  );
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
  const hasAnyRows = incomeRows.length > 0 || expenseRows.length > 0;

  return (
    <SectionCard padding="none" className="overflow-hidden">
      <DashboardSectionHeader title={title} />

      {!hasAnyRows ? (
        <p className="px-4 py-10 text-center text-sm text-muted">
          Brak przychodów i wydatków w tym okresie
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-sm">
            <BreakdownColGroup />
            <thead>
              <tr className="border-b border-border bg-slate-50/90">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted">
                  Kategoria
                </th>
                <th className={TH_NUM}>Wykonanie</th>
                <th className={TH_NUM}>Budżet</th>
                <th className={TH_NUM}>% wyk.</th>
                <th className={TH_NUM}>Pozostało</th>
                <th className={cn(TH_NUM, "pr-4")}>Nadwyżka / przek.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <SectionLabelRow label="Przychody" accent="income" />
              {incomeRows.length === 0 ? (
                <EmptySectionRow message="Brak przychodów w tym okresie" />
              ) : (
                <>
                  {incomeRows.map((row) => (
                    <BreakdownRow
                      key={`income-${row.categoryId}`}
                      row={row}
                      isExpense={false}
                      href={
                        row.categoryId === "__uncategorized__"
                          ? `/transactions?type=income&period=custom&from=${periodFrom}&to=${periodTo}`
                          : `/transactions?type=income&category=${row.categoryId}&period=custom&from=${periodFrom}&to=${periodTo}`
                      }
                    />
                  ))}
                  <TotalsRow totals={incomeTotals} isExpense={false} />
                </>
              )}

              <SectionLabelRow label="Wydatki" accent="expense" />
              {expenseRows.length === 0 ? (
                <EmptySectionRow message="Brak wydatków w tym okresie" />
              ) : (
                <>
                  {expenseRows.map((row) => (
                    <BreakdownRow
                      key={`expense-${row.categoryId}`}
                      row={row}
                      isExpense
                      href={
                        row.categoryId === "__uncategorized__"
                          ? `/transactions?type=expense&period=custom&from=${periodFrom}&to=${periodTo}`
                          : `/transactions?type=expense&category=${row.categoryId}&period=custom&from=${periodFrom}&to=${periodTo}`
                      }
                    />
                  ))}
                  <TotalsRow totals={expenseTotals} isExpense />
                </>
              )}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

function SectionLabelRow({
  label,
  accent,
}: {
  label: string;
  accent: "income" | "expense";
}) {
  const styles =
    accent === "income"
      ? "bg-emerald-50/90 text-emerald-800 border-emerald-100"
      : "bg-rose-50/90 text-rose-800 border-rose-100";

  return (
    <tr className={cn("border-y text-xs font-semibold uppercase tracking-wide", styles)}>
      <td colSpan={6} className="px-4 py-2">
        {label}
      </td>
    </tr>
  );
}

function EmptySectionRow({ message }: { message: string }) {
  return (
    <tr>
      <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
        {message}
      </td>
    </tr>
  );
}

function TotalsRow({
  totals,
  isExpense,
}: {
  totals: BudgetBreakdownTotals;
  isExpense: boolean;
}) {
  return (
    <tr className="bg-slate-50/90 font-semibold text-slate-900">
      <td className="px-4 py-3">Razem</td>
      <td className={cn(NUM, "py-3")}>{formatPln(totals.tracked)}</td>
      <td className={cn(NUM, "py-3 text-muted-foreground")}>
        {totals.budget != null ? formatPln(totals.budget) : "—"}
      </td>
      <td className={cn(NUM, "py-3 text-muted-foreground")}>
        {totals.completionPct != null ? formatPercent(totals.completionPct) : "—"}
      </td>
      <td className={cn(NUM, "py-3 text-muted-foreground")}>
        {totals.remaining != null ? formatPln(totals.remaining) : "—"}
      </td>
      <td
        className={cn(
          NUM,
          "py-3 pr-4",
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
    <tr className="transition-colors hover:bg-slate-50/70">
      <td className="px-4 py-2.5 align-middle">
        <Link href={href} className="font-medium text-slate-800 hover:text-primary hover:underline">
          {row.categoryName}
        </Link>
        {row.categoryId !== "__uncategorized__" && row.budget == null && row.tracked > 0 && (
          <div>
            <Link href="/budgets" className="text-[11px] text-muted hover:text-foreground">
              Ustaw budżet
            </Link>
          </div>
        )}
      </td>
      <td className={cn(NUM, "text-slate-800")}>{formatPln(row.tracked)}</td>
      <td className={cn(NUM, "text-muted-foreground")}>
        {row.budget != null ? formatPln(row.budget) : "—"}
      </td>
      <td
        className={cn(
          NUM,
          status === "over" && "bg-rose-50 text-rose-700",
          status === "warn" && "bg-amber-50 text-amber-800",
          status === "ok" && "text-emerald-700",
          status === "none" && "text-muted-foreground"
        )}
      >
        {row.completionPct != null ? formatPercent(row.completionPct) : "—"}
      </td>
      <td className={cn(NUM, "text-muted-foreground")}>
        {row.remaining != null ? formatPln(row.remaining) : "—"}
      </td>
      <td
        className={cn(
          NUM,
          "pr-4",
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
