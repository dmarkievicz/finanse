import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { BalanceMode } from "@/lib/supabase/rpc";
import {
  rpcCategoryBreakdown,
  rpcCategoriesAnalyticsBundle,
} from "@/lib/supabase/rpc";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import type { CategoriesPeriod } from "@/lib/categories/period";
import type { CategoryType } from "@/types/database";
import { detectTidyUpIssues, type TidyUpIssues } from "@/lib/categories/tidy-up";

export type CategoriesTab =
  | "expense"
  | "income"
  | "all"
  | "budgeted"
  | "no_budget"
  | "tidy";

export type CategorySortField = "amount" | "tx" | "name" | "share" | "trend";

export interface CategoryAnalyticsRow {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
  icon: string | null;
  totalPln: number;
  prevTotalPln: number;
  txCount: number;
  prevTxCount: number;
  sharePct: number;
  trendDelta: number | null;
  trendPct: number | null;
  avg3m: number | null;
  avg12m: number | null;
  sparkline: number[];
  budgetLimit: number | null;
  budgetPct: number | null;
  overBudget: boolean;
  subcategories: CategorySubRow[];
  isArchived: boolean;
}

export interface CategorySubRow {
  id: string;
  name: string;
  totalPln: number;
  txCount: number;
  shareInCategoryPct: number;
}

export interface CategoriesKpis {
  expenseTotal: number;
  incomeTotal: number;
  activeCount: number;
  topExpenseName: string | null;
  topExpenseAmount: number;
  emptyCount: number;
  overBudgetCount: number;
  uncategorizedExpenseCount: number;
  uncategorizedIncomeCount: number;
}

export interface CategoriesAnalyticsData {
  period: CategoriesPeriod;
  tab: CategoriesTab;
  showEmpty: boolean;
  search: string;
  sort: CategorySortField;
  sortDir: "asc" | "desc";
  minAmount?: number;
  maxAmount?: number;
  kpis: CategoriesKpis;
  rows: CategoryAnalyticsRow[];
  tidy: TidyUpIssues;
  expenseTotal: number;
  incomeTotal: number;
}

interface BreakdownRow {
  category_id: string | null;
  category_name: string | null;
  total_pln: number;
  tx_count: number;
}

interface SubRow {
  category_id: string;
  subcategory_id: string;
  subcategory_name: string;
  total_pln: number;
  tx_count: number;
}

interface MonthlyRow {
  category_id: string;
  month_key: string;
  total_pln: number;
}

interface BundlePayload {
  expense_current: BreakdownRow[];
  expense_previous: BreakdownRow[];
  income_current: BreakdownRow[];
  income_previous: BreakdownRow[];
  subcategory_expense: SubRow[];
  subcategory_income: SubRow[];
  monthly_expense: MonthlyRow[];
  monthly_income: MonthlyRow[];
  uncategorized: { tx_type: string; tx_count: number; total_pln: number }[];
  budgets: { category_id: string; limit_pln: number }[];
  expense_total: number;
  income_total: number;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}

function buildSparkline(
  categoryId: string,
  monthly: MonthlyRow[],
  months = 12
): number[] {
  const byMonth = new Map<string, number>();
  for (const m of monthly) {
    if (m.category_id === categoryId) {
      byMonth.set(
        m.month_key,
        (byMonth.get(m.month_key) ?? 0) + Number(m.total_pln)
      );
    }
  }
  const keys = [...byMonth.keys()].sort();
  const last = keys.slice(-months);
  return last.map((k) => byMonth.get(k) ?? 0);
}

function monthlyAvg(
  categoryId: string,
  monthly: MonthlyRow[],
  count: number
): number | null {
  const vals = buildSparkline(categoryId, monthly, count);
  if (!vals.length) return null;
  const slice = vals.slice(-count);
  if (!slice.some((v) => v > 0)) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function parseFilters(params: Record<string, string | undefined>) {
  const tab = (params.tab ?? "expense") as CategoriesTab;
  const showEmpty = params.showEmpty === "1";
  const search = (params.q ?? "").trim().toLowerCase();
  const sort = (params.sort ?? "amount") as CategorySortField;
  const sortDir: "asc" | "desc" = params.dir === "asc" ? "asc" : "desc";
  const minAmount = params.min ? Number(params.min) : undefined;
  const maxAmount = params.max ? Number(params.max) : undefined;
  return { tab, showEmpty, search, sort, sortDir, minAmount, maxAmount };
}

function matchesTab(
  row: CategoryAnalyticsRow,
  tab: CategoriesTab
): boolean {
  if (tab === "all") return true;
  if (tab === "expense") return row.type === "expense" || row.type === "both";
  if (tab === "income") return row.type === "income" || row.type === "both";
  if (tab === "budgeted") return row.budgetLimit != null && row.budgetLimit > 0;
  if (tab === "no_budget") return !row.budgetLimit;
  return true;
}

function sortRows(
  rows: CategoryAnalyticsRow[],
  sort: CategorySortField,
  dir: "asc" | "desc"
): CategoryAnalyticsRow[] {
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case "name":
        cmp = a.name.localeCompare(b.name, "pl");
        break;
      case "tx":
        cmp = a.txCount - b.txCount;
        break;
      case "share":
        cmp = a.sharePct - b.sharePct;
        break;
      case "trend":
        cmp = (a.trendDelta ?? 0) - (b.trendDelta ?? 0);
        break;
      default:
        cmp = a.totalPln - b.totalPln;
    }
    return cmp * mul;
  });
}

function parseBundle(raw: Record<string, unknown> | null): BundlePayload | null {
  if (!raw) return null;
  return {
    expense_current: (raw.expense_current as BreakdownRow[]) ?? [],
    expense_previous: (raw.expense_previous as BreakdownRow[]) ?? [],
    income_current: (raw.income_current as BreakdownRow[]) ?? [],
    income_previous: (raw.income_previous as BreakdownRow[]) ?? [],
    subcategory_expense: (raw.subcategory_expense as SubRow[]) ?? [],
    subcategory_income: (raw.subcategory_income as SubRow[]) ?? [],
    monthly_expense: (raw.monthly_expense as MonthlyRow[]) ?? [],
    monthly_income: (raw.monthly_income as MonthlyRow[]) ?? [],
    uncategorized: (raw.uncategorized as BundlePayload["uncategorized"]) ?? [],
    budgets: (raw.budgets as BundlePayload["budgets"]) ?? [],
    expense_total: Number(raw.expense_total ?? 0),
    income_total: Number(raw.income_total ?? 0),
  };
}

async function fetchBundleFallback(
  supabase: ServerSupabaseClient,
  period: CategoriesPeriod,
  mode: BalanceMode
): Promise<BundlePayload> {
  const { current, previous } = period;
  const [expCurr, expPrev] = await Promise.all([
    rpcCategoryBreakdown(supabase, current.from, current.to, mode),
    rpcCategoryBreakdown(supabase, previous.from, previous.to, mode),
  ]);

  let incCurrData: BreakdownRow[] = [];
  let incPrevData: BreakdownRow[] = [];
  try {
    const [incCurr, incPrev] = await Promise.all([
      supabase.rpc("get_category_breakdown_typed", {
        p_from: current.from,
        p_to: current.to,
        p_mode: mode,
        p_tx_type: "income",
      } as never),
      supabase.rpc("get_category_breakdown_typed", {
        p_from: previous.from,
        p_to: previous.to,
        p_mode: mode,
        p_tx_type: "income",
      } as never),
    ]);
    if (!incCurr.error) incCurrData = (incCurr.data ?? []) as BreakdownRow[];
    if (!incPrev.error) incPrevData = (incPrev.data ?? []) as BreakdownRow[];
  } catch {
    /* migracja 20 może nie być zastosowana */
  }

  const expenseTotal = expCurr
    .filter((r) => r.category_id)
    .reduce((s, r) => s + Number(r.total_pln), 0);
  const incomeTotal = incCurrData
    .filter((r) => r.category_id)
    .reduce((s, r) => s + Number(r.total_pln), 0);

  return {
    expense_current: expCurr as BreakdownRow[],
    expense_previous: expPrev as BreakdownRow[],
    income_current: incCurrData,
    income_previous: incPrevData,
    subcategory_expense: [],
    subcategory_income: [],
    monthly_expense: [],
    monthly_income: [],
    uncategorized: [],
    budgets: [],
    expense_total: expenseTotal,
    income_total: incomeTotal,
  };
}

export async function fetchCategoriesAnalytics(
  supabase: ServerSupabaseClient,
  period: CategoriesPeriod,
  params: Record<string, string | undefined>
): Promise<CategoriesAnalyticsData> {
  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);
  const filters = parseFilters(params);

  const [bundleRaw, catsRes] = await Promise.all([
    rpcCategoriesAnalyticsBundle(supabase, period, mode).catch(() => null),
    supabase
      .from("categories")
      .select("id, name, type, color, icon, sort_order")
      .is("deleted_at", null)
      .order("sort_order")
      .order("name"),
  ]);

  if (catsRes.error) throw catsRes.error;

  const bundle: BundlePayload =
    parseBundle(bundleRaw) ??
    (await fetchBundleFallback(supabase, period, mode));

  const expenseMap = new Map(
    bundle.expense_current.map((r) => [
      r.category_id,
      { total: Number(r.total_pln), count: Number(r.tx_count) },
    ])
  );
  const expensePrevMap = new Map(
    bundle.expense_previous.map((r) => [
      r.category_id,
      { total: Number(r.total_pln), count: Number(r.tx_count) },
    ])
  );
  const incomeMap = new Map(
    bundle.income_current.map((r) => [
      r.category_id,
      { total: Number(r.total_pln), count: Number(r.tx_count) },
    ])
  );
  const incomePrevMap = new Map(
    bundle.income_previous.map((r) => [
      r.category_id,
      { total: Number(r.total_pln), count: Number(r.tx_count) },
    ])
  );

  const budgetMap = new Map(
    bundle.budgets.map((b) => [b.category_id, Number(b.limit_pln)])
  );

  const subByCategory = new Map<string, CategorySubRow[]>();
  const subSource =
    filters.tab === "income"
      ? bundle.subcategory_income
      : filters.tab === "all"
        ? [...bundle.subcategory_expense, ...bundle.subcategory_income]
        : bundle.subcategory_expense;
  for (const s of subSource) {
    const expT = expenseMap.get(s.category_id)?.total ?? 0;
    const incT = incomeMap.get(s.category_id)?.total ?? 0;
    const catTotal =
      filters.tab === "income"
        ? incT
        : filters.tab === "expense"
          ? expT
          : expT + incT;
    const total = Number(s.total_pln);
    const list = subByCategory.get(s.category_id) ?? [];
    list.push({
      id: s.subcategory_id,
      name: s.subcategory_name,
      totalPln: total,
      txCount: Number(s.tx_count),
      shareInCategoryPct: catTotal > 0 ? (total / catTotal) * 100 : 0,
    });
    subByCategory.set(s.category_id, list);
  }

  const monthly =
    filters.tab === "income"
      ? bundle.monthly_income
      : filters.tab === "all"
        ? [...bundle.monthly_expense, ...bundle.monthly_income]
        : bundle.monthly_expense;

  const expenseTotal = Number(bundle.expense_total);
  const incomeTotal = Number(bundle.income_total);

  const cats = (catsRes.data ?? []) as {
    id: string;
    name: string;
    type: string;
    color: string | null;
    icon: string | null;
  }[];

  const rows: CategoryAnalyticsRow[] = cats.map((c) => {
    const isIncomeTab = filters.tab === "income";
    const isAllTab = filters.tab === "all";
    const catType = c.type as CategoryType;

    let totalPln = 0;
    let prevTotalPln = 0;
    let txCount = 0;
    let prevTxCount = 0;
    let baseTotal = expenseTotal;

    if (isIncomeTab || (isAllTab && catType === "income")) {
      const curr = incomeMap.get(c.id);
      const prev = incomePrevMap.get(c.id);
      totalPln = curr?.total ?? 0;
      prevTotalPln = prev?.total ?? 0;
      txCount = curr?.count ?? 0;
      prevTxCount = prev?.count ?? 0;
      baseTotal = incomeTotal;
    } else if (isAllTab && catType === "both") {
      const exp = expenseMap.get(c.id);
      const inc = incomeMap.get(c.id);
      const expPrev = expensePrevMap.get(c.id);
      const incPrev = incomePrevMap.get(c.id);
      totalPln = (exp?.total ?? 0) + (inc?.total ?? 0);
      prevTotalPln = (expPrev?.total ?? 0) + (incPrev?.total ?? 0);
      txCount = (exp?.count ?? 0) + (inc?.count ?? 0);
      prevTxCount = (expPrev?.count ?? 0) + (incPrev?.count ?? 0);
      baseTotal = expenseTotal + incomeTotal;
    } else {
      const curr = expenseMap.get(c.id);
      const prev = expensePrevMap.get(c.id);
      totalPln = curr?.total ?? 0;
      prevTotalPln = prev?.total ?? 0;
      txCount = curr?.count ?? 0;
      prevTxCount = prev?.count ?? 0;
      baseTotal = expenseTotal;
    }

    const sharePct = baseTotal > 0 ? (totalPln / baseTotal) * 100 : 0;
    const trendDelta = totalPln - prevTotalPln;
    const trendPctVal = pctChange(totalPln, prevTotalPln);
    const limit = budgetMap.get(c.id) ?? null;
    const budgetPct = limit && limit > 0 ? (totalPln / limit) * 100 : null;

    return {
      id: c.id,
      name: c.name,
      type: c.type as CategoryType,
      color: c.color,
      icon: c.icon,
      totalPln,
      prevTotalPln,
      txCount,
      prevTxCount,
      sharePct,
      trendDelta: txCount > 0 || prevTotalPln > 0 ? trendDelta : null,
      trendPct: trendPctVal,
      avg3m: monthlyAvg(c.id, monthly, 3),
      avg12m: monthlyAvg(c.id, monthly, 12),
      sparkline: buildSparkline(c.id, monthly),
      budgetLimit: limit,
      budgetPct,
      overBudget: limit != null && limit > 0 && totalPln > limit,
      subcategories: (subByCategory.get(c.id) ?? []).sort(
        (a, b) => b.totalPln - a.totalPln
      ),
      isArchived: false,
    };
  });

  let filtered = rows.filter((r) => matchesTab(r, filters.tab));
  if (!filters.showEmpty) {
    filtered = filtered.filter((r) => r.txCount > 0 || r.budgetLimit != null);
  }
  if (filters.search) {
    filtered = filtered.filter((r) =>
      r.name.toLowerCase().includes(filters.search)
    );
  }
  if (filters.minAmount != null) {
    filtered = filtered.filter((r) => r.totalPln >= filters.minAmount!);
  }
  if (filters.maxAmount != null) {
    filtered = filtered.filter((r) => r.totalPln <= filters.maxAmount!);
  }

  filtered = sortRows(filtered, filters.sort, filters.sortDir);

  const activeCount = rows.filter((r) => r.txCount > 0).length;
  const topExpense = [...rows]
    .filter((r) => r.type === "expense" || r.type === "both")
    .sort((a, b) => b.totalPln - a.totalPln)[0];

  const tidy = detectTidyUpIssues(rows, bundle.uncategorized);

  const kpis: CategoriesKpis = {
    expenseTotal,
    incomeTotal,
    activeCount,
    topExpenseName: topExpense?.totalPln ? topExpense.name : null,
    topExpenseAmount: topExpense?.totalPln ?? 0,
    emptyCount: rows.filter((r) => r.txCount === 0).length,
    overBudgetCount: rows.filter((r) => r.overBudget).length,
    uncategorizedExpenseCount: tidy.uncategorizedExpense.count,
    uncategorizedIncomeCount: tidy.uncategorizedIncome.count,
  };

  return {
    period,
    tab: filters.tab,
    showEmpty: filters.showEmpty,
    search: filters.search,
    sort: filters.sort,
    sortDir: filters.sortDir,
    minAmount: filters.minAmount,
    maxAmount: filters.maxAmount,
    kpis,
    rows: filtered,
    tidy,
    expenseTotal,
    incomeTotal,
  };
}

export async function fetchCategoryDetailAnalytics(
  supabase: ServerSupabaseClient,
  categoryId: string,
  period: CategoriesPeriod
) {
  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);

  const { data: cat, error } = await supabase
    .from("categories")
    .select("id, name, type, color, icon")
    .eq("id", categoryId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  if (!cat) return null;

  const bundle =
    parseBundle(await rpcCategoriesAnalyticsBundle(supabase, period, mode).catch(() => null)) ??
    (await fetchBundleFallback(supabase, period, mode));

  const c = cat as { id: string; name: string; type: string; color: string | null; icon: string | null };
  const isIncome = c.type === "income";

  const currMap = new Map(
    (isIncome ? bundle.income_current : bundle.expense_current).map((r) => [
      r.category_id,
      r,
    ])
  );
  const prevMap = new Map(
    (isIncome ? bundle.income_previous : bundle.expense_previous).map((r) => [
      r.category_id,
      r,
    ])
  );
  const current = currMap.get(categoryId);
  const previous = prevMap.get(categoryId);

  const monthly = isIncome ? bundle.monthly_income : bundle.monthly_expense;
  const monthlyTrend = buildSparkline(categoryId, monthly).map((total, i) => {
    const keys = [...new Set(monthly.map((m) => m.month_key))].sort();
    const key = keys[i] ?? "";
    return { month: key, total };
  });

  const subs = (isIncome ? bundle.subcategory_income : bundle.subcategory_expense)
    .filter((s) => s.category_id === categoryId)
    .map((s) => ({
      id: s.subcategory_id,
      name: s.subcategory_name,
      totalPln: Number(s.total_pln),
      txCount: Number(s.tx_count),
    }));

  const budget = bundle.budgets.find((b) => b.category_id === categoryId);

  const { from, to } = period.current;
  const txType = isIncome ? "income" : "expense";
  const { data: topTx } = await supabase
    .from("transactions")
    .select("id, date, details, transaction_entries(amount_pln)")
    .eq("category_id", categoryId)
    .eq("type", txType)
    .is("deleted_at", null)
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .limit(10);

  const topTransactions = ((topTx ?? []) as {
    id: string;
    date: string;
    details: string | null;
    transaction_entries: { amount_pln: number }[];
  }[]).map((t) => ({
    id: t.id,
    date: t.date,
    details: t.details,
    amount_pln: Math.abs(Number(t.transaction_entries?.[0]?.amount_pln ?? 0)),
  }));

  const totalPln = current ? Number(current.total_pln) : 0;
  const prevTotal = previous ? Number(previous.total_pln) : 0;
  const txCount = current ? Number(current.tx_count) : 0;
  const limit = budget ? Number(budget.limit_pln) : null;

  return {
    ...c,
    type: c.type as CategoryType,
    totalPln,
    prevTotalPln: prevTotal,
    txCount,
    trendDelta: totalPln - prevTotal,
    trendPct: pctChange(totalPln, prevTotal),
    avg3m: monthlyAvg(categoryId, monthly, 3),
    avg12m: monthlyAvg(categoryId, monthly, 12),
    monthlyTrend,
    subcategories: subs,
    budgetLimit: limit,
    budgetPct: limit && limit > 0 ? (totalPln / limit) * 100 : null,
    overBudget: limit != null && limit > 0 && totalPln > limit,
    topTransactions,
    period,
  };
}
