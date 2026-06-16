import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardPeriod } from "@/lib/dashboard/period";
import type { BalanceMode } from "@/lib/supabase/rpc";
import {
  buildCategorySlices,
  type DashboardAccountRow,
  type DashboardData,
  type DashboardKpi,
  type RecentTransactionRow,
} from "@/lib/queries/dashboard";
import { fetchInvestments } from "@/lib/queries/investments";
import { fetchInstrumentsMarketValue } from "@/lib/queries/net-worth";
import { fetchInstrumentsPortfolio } from "@/lib/queries/instruments";
import { computeCurrencyExposure } from "@/lib/dashboard/currency-exposure";
import { isAssetLedgerAccount } from "@/lib/accounts/classification";
import type { AccountBalance, AccountType, CategoryBreakdown } from "@/types/database";

interface BundleCashflow {
  income_pln: number;
  expense_pln: number;
  surplus_pln: number;
}

interface BundleAccount {
  account_id: string;
  account_name: string;
  account_type: string;
  currency: string;
  balance_pln: number;
  prev_balance_pln: number;
  lifecycle_status: string;
  show_on_dashboard: boolean;
  include_in_net_worth: boolean;
  has_opening_balance: boolean;
}

interface BundleRecentTx {
  id: string;
  date: string;
  type: string;
  status: string;
  category_name: string | null;
  entries: { amount_pln: number; account_name: string | null }[];
}

export interface DashboardBundleRaw {
  net_worth: number;
  prev_net_worth: number;
  liquid_assets: number;
  prev_liquid_assets: number;
  current_cashflow: BundleCashflow;
  prev_cashflow: BundleCashflow;
  category_current: CategoryBreakdown[];
  category_previous: CategoryBreakdown[];
  accounts: BundleAccount[];
  recent_transactions: BundleRecentTx[];
}

function num(v: unknown): number {
  return Number(v ?? 0);
}

function parseBundle(raw: Record<string, unknown>): DashboardBundleRaw {
  const cf = (o: unknown): BundleCashflow => {
    const c = (o ?? {}) as Record<string, unknown>;
    return {
      income_pln: num(c.income_pln),
      expense_pln: num(c.expense_pln),
      surplus_pln: num(c.surplus_pln),
    };
  };

  const cats = (arr: unknown): CategoryBreakdown[] =>
    ((arr ?? []) as Record<string, unknown>[]).map((c) => ({
      category_id: (c.category_id as string) ?? null,
      category_name: (c.category_name as string) ?? null,
      total_pln: num(c.total_pln),
      tx_count: Number(c.tx_count ?? 0),
    }));

  return {
    net_worth: num(raw.net_worth),
    prev_net_worth: num(raw.prev_net_worth),
    liquid_assets: num(raw.liquid_assets),
    prev_liquid_assets: num(raw.prev_liquid_assets),
    current_cashflow: cf(raw.current_cashflow),
    prev_cashflow: cf(raw.prev_cashflow),
    category_current: cats(raw.category_current),
    category_previous: cats(raw.category_previous),
    accounts: ((raw.accounts ?? []) as Record<string, unknown>[]).map((a) => ({
      account_id: String(a.account_id),
      account_name: String(a.account_name),
      account_type: String(a.account_type),
      currency: String(a.currency),
      balance_pln: num(a.balance_pln),
      prev_balance_pln: num(a.prev_balance_pln),
      lifecycle_status: String(a.lifecycle_status),
      show_on_dashboard: Boolean(a.show_on_dashboard),
      include_in_net_worth: Boolean(a.include_in_net_worth),
      has_opening_balance: Boolean(a.has_opening_balance),
    })),
    recent_transactions: ((raw.recent_transactions ?? []) as Record<string, unknown>[]).map(
      (t) => ({
        id: String(t.id),
        date: String(t.date),
        type: String(t.type),
        status: String(t.status),
        category_name: (t.category_name as string) ?? null,
        entries: ((t.entries ?? []) as Record<string, unknown>[]).map((e) => ({
          amount_pln: num(e.amount_pln),
          account_name: (e.account_name as string) ?? null,
        })),
      })
    ),
  };
}

function formatTransactionAmount(
  type: string,
  entries: { amount_pln: number; account_name: string | null }[]
): { amountLabel: string; amountPln: number; account: string } {
  if (!entries.length) return { amountLabel: "—", amountPln: 0, account: "—" };

  if (type === "transfer") {
    const source = entries.find((e) => e.amount_pln < 0);
    const target = entries.find((e) => e.amount_pln > 0);
    const amount = Math.abs(Number(source?.amount_pln ?? entries[0].amount_pln));
    const fmt = new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 0,
    }).format(amount);
    return {
      amountLabel: fmt,
      amountPln: amount,
      account: `${source?.account_name ?? "?"} → ${target?.account_name ?? "?"}`,
    };
  }

  const entry = entries[0];
  const amount = Number(entry.amount_pln);
  return {
    amountLabel: new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      signDisplay: "exceptZero",
      maximumFractionDigits: 0,
    }).format(amount),
    amountPln: amount,
    account: entry.account_name ?? "—",
  };
}

function calcDelta(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  return current - previous;
}

function calcRateDelta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round((current - previous) * 10) / 10;
}

export async function rpcDashboardBundle(
  supabase: ServerSupabaseClient,
  period: DashboardPeriod,
  mode: BalanceMode
): Promise<DashboardBundleRaw | null> {
  const { current, previous } = period;
  const { data, error } = await supabase.rpc(
    "get_dashboard_bundle",
    {
      p_current_from: current.from,
      p_current_to: current.to,
      p_prev_from: previous.from,
      p_prev_to: previous.to,
      p_as_of: current.to,
      p_prev_as_of: previous.to,
      p_mode: mode,
    } as never
  );

  if (error) {
    if (error.code === "PGRST202" || /get_dashboard_bundle/i.test(error.message ?? "")) {
      return null;
    }
    throw error;
  }

  const bundle = parseBundle((data ?? {}) as Record<string, unknown>);

  const { error: instFnErr } = await supabase.rpc("get_instruments_market_value_pln" as never);
  if (instFnErr) {
    const instTotal = await fetchInstrumentsMarketValue(supabase);
    bundle.net_worth += instTotal;
    bundle.prev_net_worth += instTotal;
  }

  return bundle;
}

export function bundleToDashboardCore(
  bundle: DashboardBundleRaw,
  period: DashboardPeriod
): Pick<
  DashboardData,
  | "period"
  | "asOfDate"
  | "kpis"
  | "categoryBreakdown"
  | "categoryBreakdownFull"
  | "categoryTotal"
  | "accounts"
  | "recentTransactions"
  | "currencyExposure"
> {
  const periodCashflow = bundle.current_cashflow;
  const prevCashflow = bundle.prev_cashflow;

  const savingsRate =
    periodCashflow.income_pln > 0
      ? (periodCashflow.surplus_pln / periodCashflow.income_pln) * 100
      : 0;
  const prevSavingsRate =
    prevCashflow.income_pln > 0
      ? (prevCashflow.surplus_pln / prevCashflow.income_pln) * 100
      : 0;

  const kpis: DashboardKpi = {
    netWorth: bundle.net_worth,
    netWorthChange: calcDelta(bundle.net_worth, bundle.prev_net_worth),
    liquidAssets: bundle.liquid_assets,
    liquidAssetsChange: calcDelta(bundle.liquid_assets, bundle.prev_liquid_assets),
    income: periodCashflow.income_pln,
    incomeChange: calcDelta(periodCashflow.income_pln, prevCashflow.income_pln),
    expenses: periodCashflow.expense_pln,
    expensesChange: calcDelta(periodCashflow.expense_pln, prevCashflow.expense_pln),
    surplus: periodCashflow.surplus_pln,
    surplusChange: calcDelta(periodCashflow.surplus_pln, prevCashflow.surplus_pln),
    savingsRate,
    savingsRateChange: calcRateDelta(savingsRate, prevSavingsRate),
  };

  const { slices: categoryBreakdown, total: categoryTotal } = buildCategorySlices(
    bundle.category_current,
    bundle.category_previous
  );
  const { slices: categoryBreakdownFull } = buildCategorySlices(
    bundle.category_current,
    bundle.category_previous,
    999
  );

  const accounts: DashboardAccountRow[] = bundle.accounts
    .filter((a) => !isAssetLedgerAccount(a.account_name))
    .map((a) => ({
      account_id: a.account_id,
      account_name: a.account_name,
      account_type: a.account_type,
      currency: a.currency,
      balance_pln: a.balance_pln,
      lifecycle_status: a.lifecycle_status,
      show_on_dashboard: a.show_on_dashboard,
      include_in_net_worth: a.include_in_net_worth,
      has_opening_balance: a.has_opening_balance,
      balanceChange: a.balance_pln - a.prev_balance_pln,
    }));

  const recentTransactions: RecentTransactionRow[] = bundle.recent_transactions.map((tx) => {
    const { amountLabel, amountPln, account } = formatTransactionAmount(tx.type, tx.entries);
    return {
      id: tx.id,
      date: tx.date,
      type: tx.type as RecentTransactionRow["type"],
      category:
        tx.category_name ?? (tx.type === "transfer" ? "Transfer" : "—"),
      amountLabel,
      amountPln,
      account,
      status: tx.status,
    };
  });

  const exposureInput: AccountBalance[] = accounts.map((a) => ({
    account_id: a.account_id,
    account_name: a.account_name,
    account_type: a.account_type as AccountType,
    currency: a.currency,
    balance_pln: a.balance_pln,
  }));

  return {
    period,
    asOfDate: period.current.to,
    kpis,
    categoryBreakdown,
    categoryBreakdownFull,
    categoryTotal,
    accounts,
    recentTransactions,
    currencyExposure: computeCurrencyExposure(exposureInput),
  };
}

export async function fetchDashboardInvestments(
  supabase: ServerSupabaseClient,
  asOfDate: string
): Promise<DashboardData["investments"]> {
  const [{ buildInvestmentsSection }, accountInvestments, instruments] = await Promise.all([
    import("@/lib/queries/dashboard"),
    fetchInvestments(supabase, asOfDate),
    fetchInstrumentsPortfolio(supabase),
  ]);
  return buildInvestmentsSection(instruments, accountInvestments);
}
