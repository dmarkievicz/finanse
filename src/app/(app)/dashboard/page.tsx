import { createClient } from "@/lib/supabase/server";
import { fetchDashboardData } from "@/lib/queries/dashboard";
import { fetchLookupData } from "@/lib/queries/transaction-detail";
import { fetchUserGoal } from "@/lib/queries/goals";
import { fetchPortfolioSnapshots } from "@/lib/queries/snapshots";
import { parseDashboardPeriod } from "@/lib/dashboard/period";
import { computeGoalMetrics } from "@/lib/dashboard/goal-metrics";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";
import { DashboardGoalCard } from "@/components/dashboard/dashboard-goal-card";
import { DashboardCategoryChart } from "@/components/dashboard/dashboard-category-chart";
import { DashboardAccountsPanel } from "@/components/dashboard/dashboard-accounts-panel";
import { DashboardInvestmentsPanel } from "@/components/dashboard/dashboard-investments-panel";
import { DashboardCurrencyPanel } from "@/components/dashboard/dashboard-currency-panel";
import { DashboardRecentTransactions } from "@/components/dashboard/dashboard-recent-transactions";
import { DashboardSection } from "@/components/dashboard/dashboard-ui";
import { WealthHistoryPanel } from "@/components/snapshots/wealth-history-panel";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const period = parseDashboardPeriod(params);

  const [data, lookup, snapshots] = await Promise.all([
    fetchDashboardData(supabase, period),
    fetchLookupData(supabase),
    fetchPortfolioSnapshots(supabase, 24),
  ]);

  const goal = await fetchUserGoal(supabase, data.kpis.netWorth, data.kpis.liquidAssets);
  const goalMetrics = computeGoalMetrics(
    goal.current,
    goal.target_amount,
    goal.target_date,
    data.kpis.surplus
  );

  const activeAccounts = lookup.accounts
    .filter((a) => a.lifecycle_status === "active")
    .map((a) => ({ id: a.id, name: a.name, default_currency: a.default_currency }));

  return (
    <div className="-m-2 min-h-full bg-[#f6f7f9] p-2 lg:-m-4 lg:p-4">
      <div className="mx-auto max-w-[1320px] space-y-6">
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
            dateFrom={period.current.from}
            dateTo={period.current.to}
            accounts={activeAccounts}
            categories={lookup.categories}
          />
        </header>

        <DashboardKpiGrid
          kpis={data.kpis}
          periodFrom={period.current.from}
          periodTo={period.current.to}
        />

        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <DashboardGoalCard
              name={goal.name}
              current={goal.current}
              target={goal.target_amount}
              targetDate={goal.target_date}
              metrics={goalMetrics}
            />
          </div>
          <div className="lg:col-span-7">
            <WealthHistoryPanel snapshots={snapshots} />
          </div>
        </div>

        <DashboardSection title="Wydatki">
          <DashboardCategoryChart
            categories={data.categoryBreakdown}
            total={data.categoryTotal}
            periodFrom={period.current.from}
            periodTo={period.current.to}
          />
        </DashboardSection>

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
