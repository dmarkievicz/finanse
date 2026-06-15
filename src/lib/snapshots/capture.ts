import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  rpcAccountBalances,
  rpcPeriodCashflow,
  type BalanceMode,
} from "@/lib/supabase/rpc";
import { fetchInstrumentsPortfolio } from "@/lib/queries/instruments";
import { fetchTotalNetWorth } from "@/lib/queries/net-worth";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import type { WealthSnapshotData } from "@/lib/snapshots/types";

const LIQUID_TYPES = new Set(["bank", "cash"]);

function monthBounds(date: string): { from: string; to: string } {
  const [y, m] = date.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    from: `${y}-${String(m).padStart(2, "0")}-01`,
    to: `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`,
  };
}

export async function captureWealthSnapshot(
  supabase: ServerSupabaseClient,
  userId: string,
  asOfDate = new Date().toISOString().slice(0, 10)
): Promise<WealthSnapshotData> {
  const settings = await fetchUserSettings(supabase);
  const mode: BalanceMode = balanceMode(settings);
  const { from, to } = monthBounds(asOfDate);

  const [netWorth, balances, cashflow, instruments] = await Promise.all([
    fetchTotalNetWorth(supabase, asOfDate, mode),
    rpcAccountBalances(supabase, asOfDate, mode),
    rpcPeriodCashflow(supabase, from, to, mode).catch(() => ({
      income_pln: 0,
      expense_pln: 0,
      surplus_pln: 0,
    })),
    fetchInstrumentsPortfolio(supabase),
  ]);

  const liquid = balances
    .filter((b) => LIQUID_TYPES.has(b.account_type) && Number(b.balance_pln) > 0)
    .reduce((s, b) => s + Number(b.balance_pln), 0);

  const investments = instruments.reduce((s, i) => s + i.market_value_pln, 0);
  const income = Number(cashflow.income_pln ?? 0);
  const expenses = Number(cashflow.expense_pln ?? 0);
  const surplus = Number(cashflow.surplus_pln ?? 0);

  return {
    net_worth_pln: netWorth,
    liquid_assets_pln: liquid,
    investments_pln: investments,
    income_period_pln: income,
    expenses_period_pln: expenses,
    surplus_period_pln: surplus,
    savings_rate_pct: income > 0 ? Math.round((surplus / income) * 1000) / 10 : 0,
    account_count: balances.length,
    instrument_count: instruments.length,
    captured_at: new Date().toISOString(),
  };
}

export async function saveWealthSnapshot(
  supabase: ServerSupabaseClient,
  userId: string,
  asOfDate: string,
  data: WealthSnapshotData
): Promise<void> {
  const [year, month] = asOfDate.split("-").map(Number);

  const { error: portfolioError } = await supabase.from("portfolio_snapshots").upsert(
    {
      user_id: userId,
      date: asOfDate,
      data,
    } as never,
    { onConflict: "user_id,date" }
  );
  if (portfolioError) throw portfolioError;

  const { error: monthlyError } = await supabase.from("monthly_snapshots").upsert(
    {
      user_id: userId,
      year,
      month,
      snapshot_date: asOfDate,
      data,
    } as never,
    { onConflict: "user_id,year,month" }
  );
  if (monthlyError) throw monthlyError;
}
