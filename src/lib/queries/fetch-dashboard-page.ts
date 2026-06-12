import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  parseDashboardPeriod,
  parseChartRange,
  chartMonthsCount,
  type DashboardChartRange,
} from "@/lib/dashboard/period";
import { computeGoalMetrics } from "@/lib/dashboard/goal-metrics";
import { fetchDashboardAlerts } from "@/lib/dashboard/fetch-dashboard-alerts";
import { fetchUserGoal } from "@/lib/queries/goals";
import { fetchPortfolioSnapshots } from "@/lib/queries/snapshots";
import { fetchDashboardCoreCached } from "@/lib/queries/dashboard-cached";
import {
  bundleToDashboardCore,
  fetchDashboardInvestments,
  rpcDashboardBundle,
} from "@/lib/queries/dashboard-bundle";
import {
  fetchCashflowMonths,
  fetchDashboardData,
  type CashflowMonth,
  type DashboardData,
} from "@/lib/queries/dashboard";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import type { DashboardAlert } from "@/lib/dashboard/alerts";
import type { GoalMetrics } from "@/lib/dashboard/goal-metrics";
import type { PortfolioSnapshotRow } from "@/lib/snapshots/types";

export interface DashboardGoalState {
  name: string;
  current: number;
  target_amount: number;
  target_date: string | null;
  metrics: GoalMetrics;
}

export interface DashboardPageData extends DashboardData {
  cashflowHistory: CashflowMonth[];
  chartRange: DashboardChartRange;
  alerts: DashboardAlert[];
  goal: DashboardGoalState;
  snapshots: PortfolioSnapshotRow[];
}

export async function fetchDashboardPageData(
  supabase: ServerSupabaseClient,
  userId: string | undefined,
  searchParams: Record<string, string | undefined>
): Promise<DashboardPageData> {
  const period = parseDashboardPeriod(searchParams);
  const chartRange = parseChartRange(searchParams);
  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);

  let core: Omit<DashboardData, "investments"> | null = null;
  let investments: DashboardData["investments"] | undefined;

  if (userId) {
    const cached = await fetchDashboardCoreCached(supabase, userId, period, mode);
    if (cached) {
      core = cached;
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

  if (!investments) {
    investments = await fetchDashboardInvestments(supabase, period.current.to);
  }

  const months = chartMonthsCount(chartRange);
  const [cashflowHistory, alerts, goalRow, snapshots] = await Promise.all([
    fetchCashflowMonths(supabase, Math.max(months, 12), period.current.to, mode),
    fetchDashboardAlerts(supabase, period),
    fetchUserGoal(supabase, core.kpis.netWorth, core.kpis.liquidAssets),
    fetchPortfolioSnapshots(supabase, 24),
  ]);

  const goalMetrics = computeGoalMetrics(
    goalRow.current,
    goalRow.target_amount,
    goalRow.target_date,
    core.kpis.surplus
  );

  return {
    ...core,
    investments,
    categoryBreakdownFull: core.categoryBreakdownFull ?? core.categoryBreakdown,
    cashflowHistory,
    chartRange,
    alerts,
    goal: {
      name: goalRow.name,
      current: goalRow.current,
      target_amount: goalRow.target_amount,
      target_date: goalRow.target_date,
      metrics: goalMetrics,
    },
    snapshots,
  };
}
