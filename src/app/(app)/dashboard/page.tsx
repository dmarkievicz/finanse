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
import { DashboardSection } from "@/components/dashboard/dashboard-ui";

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
    <div className="-m-2 min-h-full bg-[#f6f7f9] p-2 lg:-m-4 lg:p-4">
      <div className="mx-auto max-w-[1320px] space-y-6">
        {/* Nagłówek */}
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200/90 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Pulpit finansowy
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {period.label} · PLN
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
        </header>

        {/* KPI */}
        <DashboardKpiGrid
          kpis={data.kpis}
          periodFrom={period.current.from}
          periodTo={period.current.to}
        />

        {/* Cel + alerty */}
        <DashboardSection title="Cel i jakość danych">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <DashboardGoalCard
                name={data.goal.name}
                current={data.goal.current}
                target={data.goal.target}
                targetDate={data.goal.targetDate}
                metrics={data.goal.metrics}
              />
            </div>
            <DashboardAlertsPanel alerts={data.alerts} />
          </div>
        </DashboardSection>

        {/* Wykresy */}
        <DashboardSection title="Analiza">
          <div className="grid gap-3 lg:grid-cols-2">
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
        </DashboardSection>

        {/* Szczegóły */}
        <DashboardSection title="Szczegóły">
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <DashboardAccountsPanel accounts={data.accounts} />
            </div>
            <div className="lg:col-span-5">
              <DashboardRecentTransactions transactions={data.recentTransactions} />
            </div>
            <div className="space-y-3 lg:col-span-3">
              <DashboardInvestmentsPanel investments={data.investments} />
              <DashboardCurrencyPanel exposure={data.currencyExposure} />
            </div>
          </div>
        </DashboardSection>
      </div>
    </div>
  );
}
