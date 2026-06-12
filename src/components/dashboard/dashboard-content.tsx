import type { DashboardPageData } from "@/lib/queries/fetch-dashboard-page";
import { dashboardSubtitle } from "@/lib/dashboard/period";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { DashboardGoalCard } from "@/components/dashboard/dashboard-goal-card";
import { WealthHistoryPanel } from "@/components/snapshots/wealth-history-panel";
import { DashboardCashflowChart } from "@/components/dashboard/dashboard-cashflow-chart";
import { DashboardCategoryChart } from "@/components/dashboard/dashboard-category-chart";
import { DashboardAccountsPanel } from "@/components/dashboard/dashboard-accounts-panel";
import { DashboardRecentTransactions } from "@/components/dashboard/dashboard-recent-transactions";
import { DashboardInvestmentsPanel } from "@/components/dashboard/dashboard-investments-panel";
import { DashboardCurrencyPanel } from "@/components/dashboard/dashboard-currency-panel";
import { DashboardAlertsPanel } from "@/components/dashboard/dashboard-alerts-panel";

interface DashboardContentProps {
  data: DashboardPageData;
}

export function DashboardContent({ data }: DashboardContentProps) {
  const { period, kpis, goal, snapshots, cashflowHistory, chartRange } = data;

  return (
    <div className="mt-6 space-y-4">
      <DashboardKpiGrid
        kpis={kpis}
        period={period}
        periodFrom={period.current.from}
        periodTo={period.current.to}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <DashboardGoalCard
            name={goal.name}
            current={goal.current}
            target={goal.target_amount}
            targetDate={goal.target_date}
            metrics={goal.metrics}
          />
        </div>
        <div className="lg:col-span-7">
          <WealthHistoryPanel snapshots={snapshots} currentNetWorth={kpis.netWorth} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <DashboardCashflowChart
            data={cashflowHistory}
            chartRange={chartRange}
            periodPreset={period.preset}
            dateFrom={period.current.from}
            dateTo={period.current.to}
          />
        </div>
        <div className="lg:col-span-5">
          <DashboardCategoryChart
            categories={data.categoryBreakdown}
            categoriesFull={data.categoryBreakdownFull}
            total={data.categoryTotal}
            periodFrom={period.current.from}
            periodTo={period.current.to}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <DashboardAccountsPanel accounts={data.accounts} />
        </div>
        <div className="lg:col-span-5">
          <DashboardRecentTransactions transactions={data.recentTransactions} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-3">
          <DashboardInvestmentsPanel investments={data.investments} />
          <DashboardCurrencyPanel exposure={data.currencyExposure} />
          <DashboardAlertsPanel alerts={data.alerts} />
        </div>
      </div>
    </div>
  );
}

export { dashboardSubtitle };
