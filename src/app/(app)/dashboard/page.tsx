import { createClient } from "@/lib/supabase/server";
import { fetchDashboardData } from "@/lib/queries/dashboard";
import { fetchLookupData } from "@/lib/queries/transaction-detail";
import { parseChartRange, parseDashboardPeriod } from "@/lib/dashboard/period";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { DashboardGoalCard } from "@/components/dashboard/dashboard-goal-card";
import { DashboardCashflowChart } from "@/components/dashboard/dashboard-cashflow-chart";
import { DashboardCategoryChart } from "@/components/dashboard/dashboard-category-chart";
import { DashboardAccountsPanel } from "@/components/dashboard/dashboard-accounts-panel";
import { DashboardInvestmentsPanel } from "@/components/dashboard/dashboard-investments-panel";
import { DashboardAlertsPanel } from "@/components/dashboard/dashboard-alerts-panel";
import { DashboardCurrencyPanel } from "@/components/dashboard/dashboard-currency-panel";
import { DashboardRecentTransactions } from "@/components/dashboard/dashboard-recent-transactions";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const period = parseDashboardPeriod(params);
  const chartRange = parseChartRange(params);

  const [data, lookup] = await Promise.all([
    fetchDashboardData(supabase, period, chartRange),
    fetchLookupData(supabase),
  ]);

  const activeAccounts = lookup.accounts
    .filter((a) => a.lifecycle_status === "active")
    .map((a) => ({ id: a.id, name: a.name, default_currency: a.default_currency }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pulpit finansowy
          </h1>
          <p className="mt-1 text-sm text-muted">
            Podsumowanie finansów za {period.label} · waluta bazowa: PLN
          </p>
        </div>
        <DashboardToolbar
          periodLabel={period.label}
          periodPreset={period.preset}
          chartRange={chartRange}
          dateFrom={period.current.from}
          dateTo={period.current.to}
          accounts={activeAccounts}
          categories={lookup.categories}
        />
      </div>

      <DashboardKpiGrid
        kpis={data.kpis}
        periodFrom={period.current.from}
        periodTo={period.current.to}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <DashboardGoalCard
            name={data.goal.name}
            current={data.goal.current}
            target={data.goal.target}
            targetDate={data.goal.targetDate}
            metrics={data.goal.metrics}
          />
        </div>
        <div className="xl:col-span-4">
          <DashboardAlertsPanel alerts={data.alerts} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardCashflowChart
          data={data.cashflowHistory}
          chartRange={chartRange}
          periodPreset={period.preset}
          dateFrom={period.preset === "custom" ? period.current.from : undefined}
          dateTo={period.preset === "custom" ? period.current.to : undefined}
        />
        <DashboardCategoryChart
          categories={data.categoryBreakdown}
          total={data.categoryTotal}
          periodFrom={period.current.from}
          periodTo={period.current.to}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <DashboardAccountsPanel accounts={data.accounts} />
        </div>
        <div className="lg:col-span-5">
          <DashboardRecentTransactions transactions={data.recentTransactions} />
        </div>
        <div className="lg:col-span-3 space-y-4">
          <DashboardInvestmentsPanel investments={data.investments} />
          <DashboardCurrencyPanel exposure={data.currencyExposure} />
        </div>
      </div>
    </div>
  );
}
