import Link from "next/link";
import type { BudgetDashboardPageData } from "@/lib/queries/fetch-budget-dashboard";
import { BudgetStatusNoticeCard } from "@/components/dashboard/budget-status-notice";
import { DashboardBudgetKpiGrid } from "@/components/dashboard/dashboard-budget-kpi-grid";
import { BudgetBreakdownTable } from "@/components/dashboard/budget-breakdown-table";
import { CategoryDonutChart } from "@/components/dashboard/category-donut-chart";
import { MonthlyIncomeExpenseChart } from "@/components/dashboard/monthly-income-expense-chart";
import { MonthlyPerformanceChart } from "@/components/dashboard/monthly-performance-chart";
import { DashboardChartPanel } from "@/components/dashboard/dashboard-chart-panel";
import { SummaryPanel } from "@/components/dashboard/summary-panel";
import { SectionCard, SectionCardHeader } from "@/components/layout";

interface BudgetDashboardContentProps {
  data: BudgetDashboardPageData;
}

export function BudgetDashboardContent({ data }: BudgetDashboardContentProps) {
  const { selection } = data;

  if (!data.hasPeriodData) {
    return <EmptyPeriodState selection={selection} />;
  }

  return (
    <div className="space-y-4">
      {data.budgetStatusNotice && (
        <BudgetStatusNoticeCard notice={data.budgetStatusNotice} />
      )}

      <DashboardBudgetKpiGrid
        selection={selection}
        completionPct={data.completionPct}
        balance={data.balance}
        performanceSubtitle={data.performanceSubtitle}
        performancePositive={data.performancePositive}
        netWorth={data.netWorth}
        liquidAssets={data.liquidAssets}
        savingsRate={data.savingsRate}
        biggestExpenseName={data.biggestExpenseName}
        biggestExpenseAmount={data.biggestExpenseAmount}
      />

      <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
        <div className="flex lg:col-span-3">
          <BudgetBreakdownTable
            className="w-full"
            title={selection.breakdownTitle}
            incomeRows={data.incomeRows}
            incomeTotals={data.incomeTotals}
            expenseRows={data.expenseRows}
            expenseTotals={data.expenseTotals}
            periodFrom={selection.from}
            periodTo={selection.to}
          />
        </div>

        <div className="flex lg:col-span-2">
          <SummaryPanel className="w-full" title={selection.summaryTitle}>
            <div className="flex h-full min-h-0 flex-1 flex-col divide-y divide-border">
              <div className="flex min-h-0 flex-1 flex-col py-3 first:pt-0 last:pb-0">
                <CategoryDonutChart
                  layout="stacked"
                  title="Przychody wg kategorii"
                  slices={data.incomeDonut}
                  total={data.incomeTotals.tracked}
                  accent="income"
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col py-3 first:pt-0 last:pb-0">
                <CategoryDonutChart
                  layout="stacked"
                  title="Wydatki wg kategorii"
                  slices={data.expenseDonut}
                  total={data.expenseTotals.tracked}
                  accent="expense"
                />
              </div>
            </div>
          </SummaryPanel>
        </div>
      </div>

      {data.showMonthlyCharts && data.selection.resolvedYear != null && (
        <div className="grid gap-4 lg:grid-cols-5 lg:items-stretch">
          <div className="flex lg:col-span-3">
            <DashboardChartPanel
              className="w-full"
              title={`Przychody vs wydatki · ${data.selection.resolvedYear}`}
            >
              <MonthlyIncomeExpenseChart
                embedded
                data={data.monthlySeries}
                highlightMonth={selection.isSingleMonth ? selection.resolvedMonth : null}
                year={data.selection.resolvedYear}
              />
            </DashboardChartPanel>
          </div>
          <div className="flex lg:col-span-2">
            <DashboardChartPanel
              className="w-full"
              title={`Wynik miesięczny · ${data.selection.resolvedYear}`}
            >
              <MonthlyPerformanceChart
                embedded
                data={data.monthlySeries}
                highlightMonth={selection.isSingleMonth ? selection.resolvedMonth : null}
                year={data.selection.resolvedYear}
              />
            </DashboardChartPanel>
          </div>
        </div>
      )}
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
      <p className="text-sm text-muted">
        W tym okresie nie zarejestrowano przychodów ani wydatków. Wybierz inny miesiąc lub rok albo
        dodaj transakcje.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/transactions/new"
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Dodaj transakcję
        </Link>
        <Link
          href="/budgets"
          className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Ustaw budżety
        </Link>
      </div>
    </SectionCard>
  );
}
