import type { AccountBalance, CategoryBreakdown, MonthlyCashflow } from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  rpcAccountBalances,
  rpcCategoryBreakdown,
  rpcMonthlyCashflow,
  rpcNeedsReviewCount,
  rpcNetWorth,
} from "@/lib/supabase/rpc";
import { fetchInvestments } from "@/lib/queries/investments";
import type { AllocationSlice } from "@/lib/queries/investments";
import { fetchUserGoal } from "@/lib/queries/goals";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import type { BalanceMode } from "@/lib/supabase/rpc";

export interface MonthPoint {
  year: number;
  month: number;
  label: string;
}

export interface CashflowMonth {
  label: string;
  income: number;
  expenses: number;
}

export interface CategorySlice {
  name: string;
  pct: number;
  total: number;
  color: string;
  categoryId: string | null;
}

export interface CurrencySlice {
  code: string;
  pct: number;
  balance: number;
  color: string;
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

export interface DashboardData {
  netWorth: number;
  currentCashflow: MonthlyCashflow;
  previousCashflow: MonthlyCashflow;
  cashflowHistory: CashflowMonth[];
  categoryBreakdown: CategorySlice[];
  categoryTotal: number;
  accountBalances: AccountBalance[];
  recentTransactions: RecentTransactionRow[];
  currencyExposure: CurrencySlice[];
  needsReviewCount: number;
  goal: { name: string; current: number; target: number; targetDate: string | null };
  currentMonth: string;
  investmentsTotal: number;
  investmentsAllocation: AllocationSlice[];
}

const CATEGORY_COLORS = [
  "#1e3a5f",
  "#0d9488",
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#94a3b8",
  "#ec4899",
  "#14b8a6",
];

const CURRENCY_COLORS: Record<string, string> = {
  PLN: "#1e3a5f",
  EUR: "#0d9488",
  USD: "#3b82f6",
};

export function getLast6Months(reference: Date): MonthPoint[] {
  const months: MonthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(reference.getFullYear(), reference.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: new Intl.DateTimeFormat("pl-PL", { month: "short" }).format(d),
    });
  }
  return months;
}

function monthBounds(year: number, month: number) {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function buildCategorySlices(rows: CategoryBreakdown[]): {
  slices: CategorySlice[];
  total: number;
} {
  const total = rows.reduce((sum, r) => sum + Number(r.total_pln), 0);
  if (total === 0) return { slices: [], total: 0 };

  const top = rows.slice(0, 6);
  const rest = rows.slice(6);
  const restTotal = rest.reduce((sum, r) => sum + Number(r.total_pln), 0);

  const slices: CategorySlice[] = top.map((r, i) => ({
    name: r.category_name ?? "Bez kategorii",
    total: Number(r.total_pln),
    pct: Math.round((Number(r.total_pln) / total) * 100),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    categoryId: r.category_id,
  }));

  if (restTotal > 0) {
    slices.push({
      name: "Inne",
      total: restTotal,
      pct: Math.round((restTotal / total) * 100),
      color: CATEGORY_COLORS[6],
      categoryId: null,
    });
  }

  return { slices, total };
}

function buildCurrencySlices(balances: AccountBalance[]): CurrencySlice[] {
  const byCurrency = new Map<string, number>();
  for (const b of balances) {
    const code = b.currency || "PLN";
    byCurrency.set(code, (byCurrency.get(code) ?? 0) + Number(b.balance_pln));
  }

  const total = [...byCurrency.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return [...byCurrency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([code, balance]) => ({
      code,
      balance,
      pct: Math.round((balance / total) * 100),
      color: CURRENCY_COLORS[code] ?? "#64748b",
    }));
}

function formatTransactionAmount(
  type: string,
  entries: { amount_pln: number; accounts: { name: string } | null }[]
): { amountLabel: string; account: string } {
  if (!entries.length) {
    return { amountLabel: "—", account: "—" };
  }

  if (type === "transfer") {
    const source = entries.find((e) => e.amount_pln < 0);
    const target = entries.find((e) => e.amount_pln > 0);
    const amount = Math.abs(Number(source?.amount_pln ?? entries[0].amount_pln));
    const fmt = new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
      maximumFractionDigits: 0,
    }).format(amount);
    const from = source?.accounts?.name ?? "?";
    const to = target?.accounts?.name ?? "?";
    return { amountLabel: fmt, account: `${from} → ${to}` };
  }

  const entry = entries[0];
  const amount = Number(entry.amount_pln);
  const fmt = new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    signDisplay: "exceptZero",
    maximumFractionDigits: 0,
  }).format(amount);

  return {
    amountLabel: fmt,
    account: entry.accounts?.name ?? "—",
  };
}

export async function fetchDashboardData(
  supabase: ServerSupabaseClient,
  reference = new Date()
): Promise<DashboardData> {
  const year = reference.getFullYear();
  const month = reference.getMonth() + 1;
  const prev = new Date(reference.getFullYear(), reference.getMonth() - 1, 1);
  const prevYear = prev.getFullYear();
  const prevMonth = prev.getMonth() + 1;
  const { from, to } = monthBounds(year, month);
  const today = reference.toISOString().slice(0, 10);
  const monthPoints = getLast6Months(reference);
  const settings = await fetchUserSettings(supabase);
  const mode: BalanceMode = balanceMode(settings);

  const [
    netWorth,
    currentCashflow,
    previousCashflow,
    accountBalances,
    categoryRows,
    needsReviewCount,
    investmentsData,
    recentRes,
    ...cashflowMonths
  ] = await Promise.all([
    rpcNetWorth(supabase, today, mode),
    rpcMonthlyCashflow(supabase, year, month, mode),
    rpcMonthlyCashflow(supabase, prevYear, prevMonth, mode),
    rpcAccountBalances(supabase, today, mode),
    rpcCategoryBreakdown(supabase, from, to, mode),
    rpcNeedsReviewCount(supabase),
    fetchInvestments(supabase, today),
    supabase
      .from("transactions")
      .select(
        `id, date, type, status,
         categories (name),
         transaction_entries (amount_pln, accounts (name))`
      )
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5),
    ...monthPoints.map((m) => rpcMonthlyCashflow(supabase, m.year, m.month, mode)),
  ]);

  if (recentRes.error) throw recentRes.error;

  const { slices: categoryBreakdown, total: categoryTotal } = buildCategorySlices(categoryRows);

  const cashflowHistory: CashflowMonth[] = monthPoints.map((m, i) => ({
    label: m.label,
    income: cashflowMonths[i].income_pln,
    expenses: cashflowMonths[i].expense_pln,
  }));

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
    const entries = tx.transaction_entries ?? [];
    const { amountLabel, account } = formatTransactionAmount(tx.type, entries);
    const cat = tx.categories as { name: string } | null;

    return {
      id: tx.id,
      date: tx.date,
      type: tx.type,
      category: cat?.name ?? (tx.type === "transfer" ? "Transfer" : "—"),
      amountLabel,
      account,
      status: tx.status,
    };
  });

  const goalData = await fetchUserGoal(supabase, netWorth);
  const goal = {
    name: goalData.name,
    current: goalData.current,
    target: goalData.target_amount,
    targetDate: goalData.target_date,
  };

  const currentMonth = `${year}-${String(month).padStart(2, "0")}`;

  return {
    netWorth,
    currentCashflow,
    previousCashflow,
    cashflowHistory,
    categoryBreakdown,
    categoryTotal,
    accountBalances: accountBalances
      .filter((a) => Number(a.balance_pln) !== 0)
      .sort((a, b) =>
        a.account_name.localeCompare(b.account_name, "pl", { sensitivity: "base" })
      )
      .slice(0, 12),
    recentTransactions,
    currencyExposure: buildCurrencySlices(accountBalances),
    needsReviewCount,
    goal,
    investmentsTotal: investmentsData.totalPln,
    investmentsAllocation: investmentsData.allocation,
    currentMonth,
  };
}

export function calcTrendPercent(current: number, previous: number): string | undefined {
  if (previous === 0) return undefined;
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
}
