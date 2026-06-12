import { createClient } from "@/lib/supabase/server";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { parseDashboardPeriod } from "@/lib/dashboard/period";
import { computeGoalMetrics } from "@/lib/dashboard/goal-metrics";
import { fetchUserGoal } from "@/lib/queries/goals";
import { fetchPortfolioSnapshots } from "@/lib/queries/snapshots";
import { fetchDashboardCoreCached } from "@/lib/queries/dashboard-cached";
import {
  fetchDashboardInvestments,
  rpcDashboardBundle,
  bundleToDashboardCore,
} from "@/lib/queries/dashboard-bundle";
import { fetchDashboardData } from "@/lib/queries/dashboard";
import { DashboardGoalCard } from "@/components/dashboard/dashboard-goal-card";
import { DashboardCategoryChart } from "@/components/dashboard/dashboard-category-chart";
import { DashboardAccountsPanel } from "@/components/dashboard/dashboard-accounts-panel";
import { DashboardInvestmentsPanel } from "@/components/dashboard/dashboard-investments-panel";
import { DashboardCurrencyPanel } from "@/components/dashboard/dashboard-currency-panel";
import { DashboardRecentTransactions } from "@/components/dashboard/dashboard-recent-transactions";
import { DashboardSection } from "@/components/dashboard/dashboard-ui";
import { WealthHistoryPanel } from "@/components/snapshots/wealth-history-panel";

interface DashboardDetailsBlockProps {
  searchParams: Record<string, string | undefined>;
}

export async function DashboardDetailsBlock({ searchParams }: DashboardDetailsBlockProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const period = parseDashboardPeriod(searchParams);
  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);

  let core;
  let investments;

  if (user) {
    const cached = await fetchDashboardCoreCached(supabase, user.id, period, mode);
    if (cached) {
      core = cached;
      investments = await fetchDashboardInvestments(supabase, period.current.to);
    }
  }

  if (!core) {
    const bundle = await rpcDashboardBundle(supabase, period, mode);
    if (bundle) {
      core = bundleToDashboardCore(bundle, period);
      investments = await fetchDashboardInvestments(supabase, period.current.to);
    } else {
      const data = await fetchDashboardData(supabase, period);
      core = data;
      investments = data.investments;
    }
  }

  const [goal, snapshots] = await Promise.all([
    fetchUserGoal(supabase, core.kpis.netWorth, core.kpis.liquidAssets),
    fetchPortfolioSnapshots(supabase, 24),
  ]);

  const goalMetrics = computeGoalMetrics(
    goal.current,
    goal.target_amount,
    goal.target_date,
    core.kpis.surplus
  );

  return (
    <>
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
          <WealthHistoryPanel snapshots={snapshots} currentNetWorth={core.kpis.netWorth} />
        </div>
      </div>

      <DashboardSection title="Wydatki">
        <DashboardCategoryChart
          categories={core.categoryBreakdown}
          categoriesFull={core.categoryBreakdownFull ?? core.categoryBreakdown}
          total={core.categoryTotal}
          periodFrom={period.current.from}
          periodTo={period.current.to}
        />
      </DashboardSection>

      <DashboardSection title="Szczegóły">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <DashboardAccountsPanel accounts={core.accounts} />
          </div>
          <div className="lg:col-span-5">
            <DashboardRecentTransactions transactions={core.recentTransactions} />
          </div>
          <div className="space-y-3 lg:col-span-3">
            <DashboardInvestmentsPanel
              investments={
                investments ?? {
                  status: "empty",
                  totalPln: 0,
                  pnlPln: null,
                  allocation: [],
                  instrumentCount: 0,
                  missingPrices: 0,
                }
              }
            />
            <DashboardCurrencyPanel exposure={core.currencyExposure} />
          </div>
        </div>
      </DashboardSection>
    </>
  );
}
