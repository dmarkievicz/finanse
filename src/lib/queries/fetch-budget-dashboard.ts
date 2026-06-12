import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { CategoryType } from "@/types/database";
import {
  parseBudgetDashboardParams,
  periodCompletionPct,
  resolveBudgetDashboardQueryMode,
  MONTH_NAMES_PL,
  type BudgetDashboardSelection,
} from "@/lib/dashboard/budget-period";
import {
  buildBreakdownRow,
  sumBreakdownTotals,
  incomeDonutSlices,
  expenseDonutSlices,
  performanceLabel,
  type BudgetBreakdownRow,
  type BudgetBreakdownTotals,
  type DonutSlice,
  type MonthlyBudgetPoint,
} from "@/lib/dashboard/budget-metrics";
import {
  rpcCategoryBreakdownTyped,
  rpcMonthlyCashflow,
  type BalanceMode,
} from "@/lib/supabase/rpc";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";

interface CategoryMeta {
  id: string;
  name: string;
  type: CategoryType;
  color: string | null;
}

interface BudgetRecord {
  category_id: string;
  month: number;
  limit_pln: number;
}

export interface BudgetDashboardPageData {
  selection: BudgetDashboardSelection;
  yearOptions: number[];
  hasIncompleteBudgets: boolean;
  budgetWarning: string | null;
  completionPct: number | null;
  balance: number;
  performanceText: string;
  performancePositive: boolean;
  incomeRows: BudgetBreakdownRow[];
  incomeTotals: BudgetBreakdownTotals;
  expenseRows: BudgetBreakdownRow[];
  expenseTotals: BudgetBreakdownTotals;
  incomeDonut: DonutSlice[];
  expenseDonut: DonutSlice[];
  monthlySeries: MonthlyBudgetPoint[];
  showMonthlyCharts: boolean;
  hasPeriodData: boolean;
}

async function fetchTransactionYearRange(
  supabase: ServerSupabaseClient,
  analysisStart: string | null
): Promise<{ minYear: number; maxYear: number }> {
  const now = new Date().getFullYear();
  const [oldest, newest] = await Promise.all([
    supabase
      .from("transactions")
      .select("date")
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("transactions")
      .select("date")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const oldestDate = (oldest.data as { date: string } | null)?.date;
  const minFromTx = oldestDate ? Number(oldestDate.slice(0, 4)) : now;
  const minFromSettings = analysisStart ? Number(analysisStart.slice(0, 4)) : minFromTx;
  const minYear = Math.min(minFromTx, minFromSettings, now);
  const newestDate = (newest.data as { date: string } | null)?.date;
  const maxYear = newestDate ? Number(newestDate.slice(0, 4)) : now;

  return { minYear: Math.max(2004, minYear), maxYear: Math.max(maxYear, now) };
}

function isIncomeCategory(type: CategoryType): boolean {
  return type === "income" || type === "both";
}

function isExpenseCategory(type: CategoryType): boolean {
  return type === "expense" || type === "both";
}

function budgetForCategory(
  categoryId: string,
  categoryType: CategoryType,
  budgets: BudgetRecord[],
  selection: BudgetDashboardSelection
): number | null {
  if (selection.isAllData) return null;

  if (selection.isTotalYear) {
    const rows = budgets.filter((b) => b.category_id === categoryId);
    if (!rows.length) return null;
    return rows.reduce((s, b) => s + Number(b.limit_pln), 0);
  }

  const month = selection.resolvedMonth!;
  const row = budgets.find((b) => b.category_id === categoryId && b.month === month);
  return row ? Number(row.limit_pln) : null;
}

function buildSectionRows(
  categories: CategoryMeta[],
  trackedMap: Map<string, number>,
  budgets: BudgetRecord[],
  selection: BudgetDashboardSelection,
  typeFilter: "income" | "expense"
): BudgetBreakdownRow[] {
  const filtered = categories.filter((c) =>
    typeFilter === "income" ? isIncomeCategory(c.type) : isExpenseCategory(c.type)
  );

  const rows: BudgetBreakdownRow[] = [];

  for (const cat of filtered) {
    const tracked = trackedMap.get(cat.id) ?? 0;
    const budget = budgetForCategory(cat.id, cat.type, budgets, selection);
    if (tracked === 0 && budget == null) continue;
    rows.push(buildBreakdownRow(cat.id, cat.name, cat.color, tracked, budget));
  }

  return rows.sort((a, b) => b.tracked - a.tracked);
}

async function fetchBudgets(
  supabase: ServerSupabaseClient,
  year: number | null
): Promise<BudgetRecord[]> {
  if (year == null) return [];
  const { data, error } = await supabase
    .from("budgets")
    .select("category_id, month, limit_pln")
    .eq("year", year);
  if (error) throw error;
  return (data ?? []) as BudgetRecord[];
}

async function fetchYearMonthlySeries(
  supabase: ServerSupabaseClient,
  year: number,
  mode: BalanceMode,
  categories: CategoryMeta[],
  budgets: BudgetRecord[]
): Promise<MonthlyBudgetPoint[]> {
  const incomeIds = new Set(
    categories.filter((c) => isIncomeCategory(c.type)).map((c) => c.id)
  );
  const expenseIds = new Set(
    categories.filter((c) => isExpenseCategory(c.type)).map((c) => c.id)
  );

  const cashflows = await Promise.all(
    Array.from({ length: 12 }, (_, i) => rpcMonthlyCashflow(supabase, year, i + 1, mode))
  );

  const monthShort = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

  return cashflows.map((cf, i) => {
    const month = i + 1;
    const monthBudgets = budgets.filter((b) => b.month === month);
    let incomeBudget = 0;
    let expenseBudget = 0;
    for (const b of monthBudgets) {
      if (incomeIds.has(b.category_id)) incomeBudget += Number(b.limit_pln);
      if (expenseIds.has(b.category_id)) expenseBudget += Number(b.limit_pln);
    }
    const hasData = cf.income_pln > 0 || cf.expense_pln > 0;
    return {
      month,
      label: MONTH_NAMES_PL[i],
      shortLabel: monthShort[i],
      incomeTracked: cf.income_pln,
      expenseTracked: cf.expense_pln,
      incomeBudget,
      expenseBudget,
      performance: cf.surplus_pln,
      hasData,
    };
  });
}

export async function fetchBudgetDashboardPageData(
  supabase: ServerSupabaseClient,
  searchParams: Record<string, string | undefined>
): Promise<BudgetDashboardPageData> {
  const selection = parseBudgetDashboardParams(searchParams);
  const settings = await fetchUserSettings(supabase);
  const mode = resolveBudgetDashboardQueryMode(
    selection,
    settings?.analysis_start_date ?? null,
    balanceMode(settings)
  );

  const [yearRange, catsRes] = await Promise.all([
    fetchTransactionYearRange(supabase, settings?.analysis_start_date ?? null),
    supabase
      .from("categories")
      .select("id, name, type, color")
      .is("deleted_at", null)
      .order("name"),
  ]);

  if (catsRes.error) throw catsRes.error;
  const categories = (catsRes.data ?? []) as CategoryMeta[];

  const yearOptions: number[] = [];
  for (let y = yearRange.maxYear; y >= yearRange.minYear; y--) {
    yearOptions.push(y);
  }

  let from = selection.from;
  if (selection.isAllData) {
    from = settings?.analysis_start_date ?? `${yearRange.minYear}-01-01`;
    const oldest = await supabase
      .from("transactions")
      .select("date")
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle();
    const firstTx = (oldest.data as { date: string } | null)?.date;
    if (firstTx) {
      from = firstTx.slice(0, 10);
    }
  }
  const to = selection.to;

  const [incomeBreakdown, expenseBreakdown, budgets] = await Promise.all([
    rpcCategoryBreakdownTyped(supabase, from, to, "income", mode),
    rpcCategoryBreakdownTyped(supabase, from, to, "expense", mode),
    fetchBudgets(supabase, selection.resolvedYear),
  ]);

  const incomeMap = new Map(
    incomeBreakdown
      .filter((r) => r.category_id)
      .map((r) => [r.category_id!, Number(r.total_pln)])
  );
  const expenseMap = new Map(
    expenseBreakdown
      .filter((r) => r.category_id)
      .map((r) => [r.category_id!, Number(r.total_pln)])
  );

  const incomeRows = buildSectionRows(categories, incomeMap, budgets, selection, "income");
  const expenseRows = buildSectionRows(categories, expenseMap, budgets, selection, "expense");

  const incomeTotals = sumBreakdownTotals(incomeRows);
  const expenseTotals = sumBreakdownTotals(expenseRows);
  const balance = incomeTotals.tracked - expenseTotals.tracked;
  const perf = performanceLabel(balance);

  const incomeDonut = incomeDonutSlices(incomeRows, incomeTotals.tracked);
  const expenseDonut = expenseDonutSlices(expenseRows, expenseTotals.tracked);

  const categoriesWithSpend = new Set([
    ...incomeMap.keys(),
    ...expenseMap.keys(),
  ]);
  const budgetedIds = new Set(budgets.map((b) => b.category_id));
  const missingBudgetCount = [...categoriesWithSpend].filter((id) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return false;
    if (selection.isAllData) return false;
    return !budgetedIds.has(id);
  }).length;

  const hasIncompleteBudgets =
    !selection.isAllData && missingBudgetCount > 0 && categoriesWithSpend.size > 0;

  const budgetWarning = selection.isAllData
    ? "Budżety miesięczne nie są sumowane dla całej historii — poniżej wykonanie bez porównania do budżetu."
    : hasIncompleteBudgets
      ? "Nie wszystkie kategorie mają ustawiony budżet. Uzupełnij budżety, aby uzyskać pełną analizę wykonania."
      : null;

  let monthlySeries: MonthlyBudgetPoint[] = [];
  const showMonthlyCharts = !selection.isAllData && selection.resolvedYear != null;
  if (showMonthlyCharts) {
    monthlySeries = await fetchYearMonthlySeries(
      supabase,
      selection.resolvedYear!,
      mode,
      categories,
      budgets
    );
  }

  const hasPeriodData =
    incomeTotals.tracked > 0 ||
    expenseTotals.tracked > 0 ||
    monthlySeries.some((m) => m.hasData);

  return {
    selection,
    yearOptions,
    hasIncompleteBudgets,
    budgetWarning,
    completionPct: periodCompletionPct(selection),
    balance,
    performanceText: perf.text,
    performancePositive: perf.positive,
    incomeRows,
    incomeTotals,
    expenseRows,
    expenseTotals,
    incomeDonut,
    expenseDonut,
    monthlySeries,
    showMonthlyCharts,
    hasPeriodData,
  };
}
