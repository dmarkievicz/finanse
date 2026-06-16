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
  computeBreakdownRow,
  sumBreakdownTotals,
  incomeDonutSlices,
  expenseDonutSlices,
  performanceResult,
  type BudgetBreakdownRow,
  type BudgetBreakdownTotals,
  type DonutSlice,
  type MonthlyBudgetPoint,
} from "@/lib/dashboard/budget-metrics";
import type { CategoryBreakdown } from "@/types/database";
import {
  rpcAccountBalances,
  rpcCategoryBreakdownTyped,
  rpcMonthlyCashflow,
  rpcNetWorth,
  rpcPeriodCashflow,
  type BalanceMode,
} from "@/lib/supabase/rpc";
import { sumLiquidAssets } from "@/lib/queries/dashboard";
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

export interface BudgetStatusNotice {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface BudgetDashboardPageData {
  selection: BudgetDashboardSelection;
  yearOptions: number[];
  budgetStatusNotice: BudgetStatusNotice | null;
  completionPct: number | null;
  balance: number;
  performanceTitle: string;
  performanceSubtitle: string;
  performancePositive: boolean;
  netWorth: number;
  liquidAssets: number;
  savingsRate: number;
  biggestExpenseName: string | null;
  biggestExpenseAmount: number;
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

function mergePeriodTotals(
  rowTotals: BudgetBreakdownTotals,
  periodTracked: number
): BudgetBreakdownTotals {
  const metrics = computeBreakdownRow(periodTracked, rowTotals.budget);
  return {
    tracked: periodTracked,
    budget: rowTotals.budget,
    ...metrics,
  };
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

function buildBreakdownRows(
  breakdown: CategoryBreakdown[],
  categories: CategoryMeta[],
  budgets: BudgetRecord[],
  selection: BudgetDashboardSelection,
  section: "income" | "expense"
): BudgetBreakdownRow[] {
  const catById = new Map(categories.map((c) => [c.id, c]));
  const rows: BudgetBreakdownRow[] = [];
  const seenCategoryIds = new Set<string>();

  for (const item of breakdown) {
    const tracked = Number(item.total_pln);
    if (tracked === 0) continue;

    const categoryId = item.category_id;
    const cat = categoryId ? catById.get(categoryId) : null;
    const rowId = categoryId ?? "__uncategorized__";
    const name = item.category_name ?? cat?.name ?? "Bez kategorii";
    const color = cat?.color ?? null;
    const budget = categoryId
      ? budgetForCategory(categoryId, cat?.type ?? section, budgets, selection)
      : null;

    if (categoryId) seenCategoryIds.add(categoryId);
    rows.push(buildBreakdownRow(rowId, name, color, tracked, budget));
  }

  for (const cat of categories) {
    if (seenCategoryIds.has(cat.id)) continue;
    const inSection =
      section === "income" ? isIncomeCategory(cat.type) : isExpenseCategory(cat.type);
    if (!inSection) continue;
    const budget = budgetForCategory(cat.id, cat.type, budgets, selection);
    if (budget == null) continue;
    rows.push(buildBreakdownRow(cat.id, cat.name, cat.color, 0, budget));
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

  const [incomeBreakdown, expenseBreakdown, budgets, periodCashflow, netWorth, accountBalances] =
    await Promise.all([
      rpcCategoryBreakdownTyped(supabase, from, to, "income", mode),
      rpcCategoryBreakdownTyped(supabase, from, to, "expense", mode),
      fetchBudgets(supabase, selection.resolvedYear),
      rpcPeriodCashflow(supabase, from, to, mode),
      rpcNetWorth(supabase, to, mode),
      rpcAccountBalances(supabase, to, mode),
    ]);

  const incomeRows = buildBreakdownRows(
    incomeBreakdown,
    categories,
    budgets,
    selection,
    "income"
  );
  const expenseRows = buildBreakdownRows(
    expenseBreakdown,
    categories,
    budgets,
    selection,
    "expense"
  );

  const incomeTotals = mergePeriodTotals(
    sumBreakdownTotals(incomeRows),
    periodCashflow.income_pln
  );
  const expenseTotals = mergePeriodTotals(
    sumBreakdownTotals(expenseRows),
    periodCashflow.expense_pln
  );
  const balance = periodCashflow.surplus_pln;
  const perf = performanceResult(balance);
  const liquidAssets = sumLiquidAssets(accountBalances);
  const savingsRate =
    periodCashflow.income_pln > 0 ? (periodCashflow.surplus_pln / periodCashflow.income_pln) * 100 : 0;

  const incomeDonut = incomeDonutSlices(incomeRows, periodCashflow.income_pln);
  const expenseDonut = expenseDonutSlices(expenseRows, periodCashflow.expense_pln);

  const categoriesWithSpend = new Set([
    ...incomeBreakdown.filter((r) => r.category_id).map((r) => r.category_id!),
    ...expenseBreakdown.filter((r) => r.category_id).map((r) => r.category_id!),
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

  const budgetStatusNotice: BudgetStatusNotice | null = selection.isAllData
    ? {
        title: "Status budżetów",
        message:
          "Budżety miesięczne nie są sumowane dla całej historii — poniżej wykonanie bez porównania do budżetu.",
      }
    : hasIncompleteBudgets
      ? {
          title: "Status budżetów",
          message:
            "Nie wszystkie kategorie mają budżet. Uzupełnij brakujące limity, aby uzyskać pełną analizę wykonania.",
          actionLabel: "Uzupełnij budżety",
          actionHref: "/budgets",
        }
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

  const biggestExpense = expenseRows.reduce<BudgetBreakdownRow | null>(
    (best, row) => (row.tracked > (best?.tracked ?? 0) ? row : best),
    expenseRows[0] ?? null
  );

  return {
    selection,
    yearOptions,
    budgetStatusNotice,
    completionPct: periodCompletionPct(selection),
    balance,
    performanceTitle: perf.title,
    performanceSubtitle: perf.subtitle,
    performancePositive: perf.positive,
    netWorth,
    liquidAssets,
    savingsRate,
    biggestExpenseName: biggestExpense?.categoryName ?? null,
    biggestExpenseAmount: biggestExpense?.tracked ?? 0,
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
