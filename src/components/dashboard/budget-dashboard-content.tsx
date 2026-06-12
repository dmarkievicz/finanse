import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import type { BudgetDashboardPageData } from "@/lib/queries/fetch-budget-dashboard";
import { DashboardStatusCards } from "@/components/dashboard/dashboard-status-cards";
import { BudgetBreakdownTable } from "@/components/dashboard/budget-breakdown-table";
import { CategoryDonutChart } from "@/components/dashboard/category-donut-chart";
import { TrackedVsBudgetChart } from "@/components/dashboard/tracked-vs-budget-chart";
import { MonthlyPerformanceChart } from "@/components/dashboard/monthly-performance-chart";
import { SectionCard, SectionCardHeader } from "@/components/layout";

interface BudgetDashboardContentProps {
  data: BudgetDashboardPageData;
}

export function BudgetDashboardContent({ data }: BudgetDashboardContentProps) {
  const { selection } = data;

  if (!data.hasPeriodData) {
    return (
      <div className="mt-6">
        <EmptyPeriodState selection={selection} />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {data.budgetWarning && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p>{data.budgetWarning}</p>
            {data.hasIncompleteBudgets && (
              <Link href="/budgets" className="mt-1 inline-block font-medium underline">
                Przejdź do budżetów
              </Link>
            )}
          </div>
        </div>
      )}

      <DashboardStatusCards
        selection={selection}
        completionPct={data.completionPct}
        balance={data.balance}
        performanceText={data.performanceText}
        performancePositive={data.performancePositive}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <BudgetBreakdownTable
            title={selection.breakdownTitle}
            incomeRows={data.incomeRows}
            incomeTotals={data.incomeTotals}
            expenseRows={data.expenseRows}
            expenseTotals={data.expenseTotals}
            periodFrom={selection.from}
            periodTo={selection.to}
          />
        </div>

        <div className="space-y-4 xl:col-span-5">
          <SectionCard padding="none" className="overflow-hidden">
            <div className="border-b border-slate-200 bg-[#1e3a5f] px-4 py-3">
              <h2 className="text-[15px] font-semibold text-white">{selection.summaryTitle}</h2>
            </div>
            <div className="space-y-4 p-4">
              <CategoryDonutChart
                title="Przychody wg kategorii"
                slices={data.incomeDonut}
                total={data.incomeTotals.tracked}
                accent="income"
              />
              <CategoryDonutChart
                title="Wydatki wg kategorii"
                slices={data.expenseDonut}
                total={data.expenseTotals.tracked}
                accent="expense"
              />
            </div>
          </SectionCard>

          {data.showMonthlyCharts && data.selection.resolvedYear != null && (
            <>
              <TrackedVsBudgetChart
                data={data.monthlySeries}
                highlightMonth={selection.isSingleMonth ? selection.resolvedMonth : null}
                year={data.selection.resolvedYear}
              />
              <MonthlyPerformanceChart
                data={data.monthlySeries}
                highlightMonth={selection.isSingleMonth ? selection.resolvedMonth : null}
                year={data.selection.resolvedYear}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyPeriodState({ selection }: { selection: BudgetDashboardPageData["selection"] }) {
  return (
    <SectionCard>
      <SectionCardHeader
        title="Brak danych w wybranym okresie"
        subtitle={`${selection.yearLabel} · ${selection.periodLabel}`}
      />
      <p className="text-sm text-slate-500">
        W tym okresie nie zarejestrowano przychodów ani wydatków. Wybierz inny miesiąc lub rok albo
        dodaj transakcje.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/transactions/new"
          className="rounded-lg bg-slate-800 px-3 py-2 text-[13px] font-medium text-white hover:bg-slate-700"
        >
          Dodaj transakcję
        </Link>
        <Link
          href="/budgets"
          className="rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50"
        >
          Ustaw budżety
        </Link>
      </div>
    </SectionCard>
  );
}
