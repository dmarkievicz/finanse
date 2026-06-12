import type { AccountManageRow, CategoryBreakdown } from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  rpcAccountBalances,
  rpcAllAccountBalances,
  rpcCategoryBreakdown,
  rpcMonthlyCashflow,
  rpcNetWorth,
  rpcPeriodCashflow,
  type BalanceMode,
} from "@/lib/supabase/rpc";
import { fetchInvestments, type AllocationSlice } from "@/lib/queries/investments";
import { fetchInstrumentsPortfolio, type InstrumentRow } from "@/lib/queries/instruments";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { computeCurrencyExposure, type CurrencyExposureResult } from "@/lib/dashboard/currency-exposure";
import type { DashboardPeriod } from "@/lib/dashboard/period";
import { INSTRUMENT_TYPE_LABELS, type InstrumentType } from "@/lib/queries/instruments";
import { isGoldLedgerAccount } from "@/lib/accounts/classification";

export interface CashflowMonth {
  label: string;
  year: number;
  month: number;
  income: number;
  expenses: number;
  surplus: number;
  hasData: boolean;
}

export interface CategorySlice {
  name: string;
  pct: number;
  total: number;
  color: string;
  categoryId: string | null;
  trendPct: number | null;
}

export interface DashboardAccountRow {
  account_id: string;
  account_name: string;
  account_type: string;
  currency: string;
  balance_pln: number;
  lifecycle_status: string;
  show_on_dashboard: boolean;
  include_in_net_worth: boolean;
  has_opening_balance: boolean;
  balanceChange: number | null;
}

export interface RecentTransactionRow {
  id: string;
  date: string;
  type: "income" | "expense" | "transfer" | "exchange" | "adjustment";
  category: string;
  amountLabel: string;
  account: string;
  status: string;
}

export interface DashboardKpi {
  netWorth: number;
  netWorthChange: number | null;
  liquidAssets: number;
  liquidAssetsChange: number | null;
  income: number;
  incomeChange: number | null;
  expenses: number;
  expensesChange: number | null;
  surplus: number;
  surplusChange: number | null;
  savingsRate: number;
  savingsRateChange: number | null;
}

export interface DashboardInvestments {
  status: "ready" | "partial" | "empty" | "needs_config";
  totalPln: number;
  pnlPln: number | null;
  allocation: AllocationSlice[];
  instrumentCount: number;
  missingPrices: number;
  message?: string;
}

export interface DashboardData {
  period: DashboardPeriod;
  asOfDate: string;
  kpis: DashboardKpi;
  categoryBreakdown: CategorySlice[];
  categoryBreakdownFull: CategorySlice[];
  categoryTotal: number;
  accounts: DashboardAccountRow[];
  recentTransactions: RecentTransactionRow[];
  currencyExposure: CurrencyExposureResult;
  investments: DashboardInvestments;
}

const CATEGORY_COLORS = [
  "#94a3b8",
  "#6ee7b7",
  "#93c5fd",
  "#c4b5fd",
  "#fcd34d",
  "#fda4af",
];

const LIQUID_TYPES = new Set(["bank", "cash"]);

function sumLiquidAssets(balances: { account_type: string; balance_pln: number }[]): number {
  return balances
    .filter((b) => LIQUID_TYPES.has(b.account_type) && Number(b.balance_pln) > 0)
    .reduce((s, b) => s + Number(b.balance_pln), 0);
}

export function buildCategorySlices(
  current: CategoryBreakdown[],
  previous: CategoryBreakdown[],
  topLimit = 5
): { slices: CategorySlice[]; total: number } {
  const total = current.reduce((sum, r) => sum + Number(r.total_pln), 0);
  if (total === 0) return { slices: [], total: 0 };

  const prevMap = new Map(
    previous.map((r) => [r.category_id ?? "none", Number(r.total_pln)])
  );

  const limit = topLimit <= 0 ? current.length : topLimit;
  const top = current.slice(0, limit);
  const rest = topLimit <= 0 ? [] : current.slice(limit);
  const restTotal = rest.reduce((sum, r) => sum + Number(r.total_pln), 0);

  const slices: CategorySlice[] = top.map((r, i) => {
    const id = r.category_id ?? "none";
    const cur = Number(r.total_pln);
    const prev = prevMap.get(id) ?? 0;
    let trendPct: number | null = null;
    if (prev > 0) trendPct = Math.round(((cur - prev) / prev) * 1000) / 10;

    return {
      name: r.category_name ?? "Bez kategorii",
      total: cur,
      pct: Math.round((cur / total) * 1000) / 10,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      categoryId: r.category_id,
      trendPct,
    };
  });

  if (restTotal > 0) {
    slices.push({
      name: "Pozostałe",
      total: restTotal,
      pct: Math.round((restTotal / total) * 1000) / 10,
      color: CATEGORY_COLORS[5],
      categoryId: null,
      trendPct: null,
    });
  }

  return { slices, total };
}

function formatTransactionAmount(
  type: string,
  entries: { amount_pln: number; accounts: { name: string } | null }[]
): { amountLabel: string; account: string } {
  if (!entries.length) return { amountLabel: "—", account: "—" };

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
      account: `${source?.accounts?.name ?? "?"} → ${target?.accounts?.name ?? "?"}`,
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
    account: entry.accounts?.name ?? "—",
  };
}

export function buildInvestmentsSection(
  instruments: InstrumentRow[],
  accountInvestments: Awaited<ReturnType<typeof fetchInvestments>>
): DashboardInvestments {
  const linkedIds = new Set(
    instruments.map((i) => i.account_id).filter((id): id is string => id != null)
  );
  const unlinked = accountInvestments.positions.filter((p) => !linkedIds.has(p.account_id));
  const instrumentsTotal = instruments.reduce((s, i) => s + i.market_value_pln, 0);
  const unlinkedTotal = unlinked.reduce((s, p) => s + p.balance_pln, 0);
  const totalPln = instrumentsTotal + unlinkedTotal;
  const missingPrices = instruments.filter(
    (i) => i.quantity !== 0 && i.last_price == null
  ).length;

  if (instruments.length === 0 && accountInvestments.positions.length === 0) {
    return {
      status: "empty",
      totalPln: 0,
      pnlPln: null,
      allocation: [],
      instrumentCount: 0,
      missingPrices: 0,
      message: "Dodaj instrumenty lub konta inwestycyjne, aby śledzić portfel.",
    };
  }

  if (totalPln < 0) {
    return {
      status: "needs_config",
      totalPln,
      pnlPln: null,
      allocation: [],
      instrumentCount: instruments.length + unlinked.length,
      missingPrices,
      message:
        "Wartość portfela jest ujemna — sprawdź salda kont inwestycyjnych i wyceny instrumentów.",
    };
  }

  let allocation: AllocationSlice[] = [];
  if (instruments.length > 0) {
    const byType = new Map<string, number>();
    for (const i of instruments) {
      const label = INSTRUMENT_TYPE_LABELS[i.instrument_type as InstrumentType] ?? "Inne";
      byType.set(label, (byType.get(label) ?? 0) + i.market_value_pln);
    }
    for (const p of unlinked) {
      byType.set(p.category, (byType.get(p.category) ?? 0) + p.balance_pln);
    }
    const colors = ["#1e3a5f", "#0d9488", "#3b82f6", "#f59e0b", "#8b5cf6", "#94a3b8"];
    allocation = [...byType.entries()]
      .map(([name, t], idx) => ({
        name,
        total: t,
        pct: totalPln > 0 ? Math.round((t / totalPln) * 100) : 0,
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.total - a.total);
  } else {
    allocation = accountInvestments.allocation;
  }

  const invested = instruments.reduce((s, i) => s + i.invested_pln, 0);
  const pnlPln = instruments.length > 0 ? totalPln - invested : null;

  const status =
    missingPrices > 0 || (instruments.length === 0 && unlinked.length > 0)
      ? "partial"
      : "ready";

  return {
    status,
    totalPln,
    pnlPln,
    allocation,
    instrumentCount: instruments.length + unlinked.length,
    missingPrices,
    message:
      status === "partial"
        ? "Część danych inwestycyjnych wymaga uzupełnienia (wyceny lub instrumenty)."
        : undefined,
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

export async function fetchDashboardData(
  supabase: ServerSupabaseClient,
  period: DashboardPeriod
): Promise<DashboardData> {
  const settings = await fetchUserSettings(supabase);
  const mode: BalanceMode = balanceMode(settings);

  const {
    bundleToDashboardCore,
    fetchDashboardInvestments,
    rpcDashboardBundle,
  } = await import("@/lib/queries/dashboard-bundle");

  const bundle = await rpcDashboardBundle(supabase, period, mode);
  if (bundle) {
    const core = bundleToDashboardCore(bundle, period);
    const investments = await fetchDashboardInvestments(supabase, period.current.to);
    return { ...core, investments };
  }

  const { current, previous } = period;
  const asOfDate = current.to;
  const prevAsOfDate = previous.to;

  const [
    netWorth,
    prevNetWorth,
    periodCashflow,
    prevCashflow,
    accountBalances,
    allAccounts,
    categoryCurrent,
    categoryPrevious,
    accountInvestments,
    instruments,
    recentRes,
  ] = await Promise.all([
    rpcNetWorth(supabase, asOfDate, mode),
    rpcNetWorth(supabase, prevAsOfDate, mode),
    rpcPeriodCashflow(supabase, current.from, current.to, mode).catch(() =>
      rpcMonthlyCashflow(
        supabase,
        Number(current.from.slice(0, 4)),
        Number(current.from.slice(5, 7)),
        mode
      )
    ),
    rpcPeriodCashflow(supabase, previous.from, previous.to, mode).catch(() =>
      rpcMonthlyCashflow(
        supabase,
        Number(previous.from.slice(0, 4)),
        Number(previous.from.slice(5, 7)),
        mode
      )
    ),
    rpcAccountBalances(supabase, asOfDate, mode),
    rpcAllAccountBalances(supabase, asOfDate, mode),
    rpcCategoryBreakdown(supabase, current.from, current.to, mode),
    rpcCategoryBreakdown(supabase, previous.from, previous.to, mode),
    fetchInvestments(supabase, asOfDate),
    fetchInstrumentsPortfolio(supabase),
    supabase
      .from("transactions")
      .select(
        `id, date, type, status,
         categories (name),
         transaction_entries (amount_pln, accounts (name))`
      )
      .is("deleted_at", null)
      .neq("status", "needs_review")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  if (recentRes.error) throw recentRes.error;

  const liquidAssets = sumLiquidAssets(accountBalances);
  const [prevAllAccounts, prevAccountBalances] = await Promise.all([
    rpcAllAccountBalances(supabase, prevAsOfDate, mode),
    rpcAccountBalances(supabase, prevAsOfDate, mode),
  ]);
  const prevLiquid = sumLiquidAssets(prevAccountBalances);
  const prevBalanceByAccount = new Map(
    (prevAllAccounts as AccountManageRow[]).map((a) => [
      a.account_id,
      Number(a.balance_pln),
    ])
  );

  const savingsRate =
    periodCashflow.income_pln > 0
      ? (periodCashflow.surplus_pln / periodCashflow.income_pln) * 100
      : 0;
  const prevSavingsRate =
    prevCashflow.income_pln > 0
      ? (prevCashflow.surplus_pln / prevCashflow.income_pln) * 100
      : 0;

  const kpis: DashboardKpi = {
    netWorth,
    netWorthChange: calcDelta(netWorth, prevNetWorth),
    liquidAssets,
    liquidAssetsChange: calcDelta(liquidAssets, prevLiquid),
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
    categoryCurrent,
    categoryPrevious
  );
  const { slices: categoryBreakdownFull } = buildCategorySlices(
    categoryCurrent,
    categoryPrevious,
    999
  );

  const accounts: DashboardAccountRow[] = (allAccounts as AccountManageRow[])
    .filter((a) => !isGoldLedgerAccount(a.account_name))
    .map((a) => {
    const balance = Number(a.balance_pln);
    const prev = prevBalanceByAccount.get(a.account_id);
    const balanceChange = prev != null ? balance - prev : null;
    return {
      account_id: a.account_id,
      account_name: a.account_name,
      account_type: a.account_type,
      currency: a.currency,
      balance_pln: balance,
      lifecycle_status: a.lifecycle_status,
      show_on_dashboard: a.show_on_dashboard,
      include_in_net_worth: a.include_in_net_worth,
      has_opening_balance: a.has_opening_balance,
      balanceChange,
    };
  });

  type RecentTxRow = {
    id: string;
    date: string;
    type: RecentTransactionRow["type"];
    status: string;
    categories: { name: string } | null;
    transaction_entries: { amount_pln: number; accounts: { name: string } | null }[];
  };

  const recentTransactions: RecentTransactionRow[] = (
    (recentRes.data ?? []) as RecentTxRow[]
  ).map((tx) => {
    const { amountLabel, account } = formatTransactionAmount(
      tx.type,
      tx.transaction_entries ?? []
    );
    return {
      id: tx.id,
      date: tx.date,
      type: tx.type,
      category: (tx.categories as { name: string } | null)?.name ?? (tx.type === "transfer" ? "Transfer" : "—"),
      amountLabel,
      account,
      status: tx.status,
    };
  });

  return {
    period,
    asOfDate,
    kpis,
    categoryBreakdown,
    categoryBreakdownFull,
    categoryTotal,
    accounts,
    recentTransactions,
    currencyExposure: computeCurrencyExposure(accountBalances),
    investments: buildInvestmentsSection(instruments, accountInvestments),
  };
}

export async function fetchCashflowMonths(
  supabase: ServerSupabaseClient,
  months: number,
  asOfDate: string,
  mode: BalanceMode
): Promise<CashflowMonth[]> {
  const { rpcCashflowHistory } = await import("@/lib/supabase/rpc");
  const rows = await rpcCashflowHistory(supabase, months, asOfDate, mode);
  const monthNames = [
    "sty",
    "lut",
    "mar",
    "kwi",
    "maj",
    "cze",
    "lip",
    "sie",
    "wrz",
    "paź",
    "lis",
    "gru",
  ];
  return rows.map((r) => ({
    label: monthNames[r.month - 1] ?? String(r.month),
    year: r.year,
    month: r.month,
    income: r.income_pln,
    expenses: r.expense_pln,
    surplus: r.surplus_pln,
    hasData: r.has_data,
  }));
}

export function formatKpiPercentChange(
  current: number,
  previous: number | null,
  compareLabel: string
): string | undefined {
  if (previous == null || previous === 0) return undefined;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}% vs ${compareLabel}`;
}

export function calcTrendPercent(current: number, previous: number): string | undefined {
  if (previous === 0) return undefined;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

export function formatKpiDelta(delta: number | null, isCurrency = true): string | undefined {
  if (delta == null || delta === 0) return undefined;
  if (isCurrency) {
    const fmt = new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      signDisplay: "exceptZero",
      maximumFractionDigits: 0,
    }).format(delta);
    return `${fmt} vs poprz. okres`;
  }
  return `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} p.p. vs poprz. okres`;
}
