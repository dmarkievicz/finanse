import Link from "next/link";
import type { BudgetDashboardPageData } from "@/lib/queries/fetch-budget-dashboard";
import { BudgetStatusNoticeCard } from "@/components/dashboard/budget-status-notice";
import { DashboardBudgetKpiGrid } from "@/components/dashboard/dashboard-budget-kpi-grid";
import { BudgetBreakdownTable } from "@/components/dashboard/budget-breakdown-table";
import { CategoryDonutChart } from "@/components/dashboard/category-donut-chart";
import { TrackedVsBudgetChart } from "@/components/dashboard/tracked-vs-budget-chart";
import { MonthlyPerformanceChart } from "@/components/dashboard/monthly-performance-chart";
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
        performanceTitle={data.performanceTitle}
        performanceSubtitle={data.performanceSubtitle}
        performancePositive={data.performancePositive}
      />

      <BudgetBreakdownTable
        title={selection.breakdownTitle}
        incomeRows={data.incomeRows}
        incomeTotals={data.incomeTotals}
        expenseRows={data.expenseRows}
        expenseTotals={data.expenseTotals}
        periodFrom={selection.from}
        periodTo={selection.to}
      />

      <SummaryPanel title={selection.summaryTitle}>
        <div className="grid gap-6 md:grid-cols-2">
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
      </SummaryPanel>

      {data.showMonthlyCharts && data.selection.resolvedYear != null && (
        <div className="grid gap-4 lg:grid-cols-2">
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
