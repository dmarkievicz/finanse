export interface BudgetBreakdownRow {
  categoryId: string;
  categoryName: string;
  color: string | null;
  tracked: number;
  budget: number | null;
  completionPct: number | null;
  remaining: number | null;
  excess: number;
}

export interface BudgetBreakdownTotals {
  tracked: number;
  budget: number | null;
  completionPct: number | null;
  remaining: number | null;
  excess: number;
}

export interface DonutSlice {
  name: string;
  value: number;
  pct: number;
  color: string;
}

export interface MonthlyBudgetPoint {
  month: number;
  label: string;
  shortLabel: string;
  incomeTracked: number;
  expenseTracked: number;
  incomeBudget: number;
  expenseBudget: number;
  performance: number;
  hasData: boolean;
}

const DONUT_COLORS = [
  "#34d399",
  "#6ee7b7",
  "#a7f3d0",
  "#10b981",
  "#059669",
  "#047857",
];

const DONUT_COLORS_EXPENSE = [
  "#fb7185",
  "#f472b6",
  "#e879f9",
  "#f43f5e",
  "#ec4899",
  "#db2777",
];

export function computeBreakdownRow(
  tracked: number,
  budget: number | null
): Pick<BudgetBreakdownRow, "completionPct" | "remaining" | "excess"> {
  if (budget == null || budget <= 0) {
    return { completionPct: null, remaining: null, excess: 0 };
  }
  const completionPct = Math.round((tracked / budget) * 1000) / 10;
  const remaining = Math.max(budget - tracked, 0);
  const excess = Math.max(tracked - budget, 0);
  return { completionPct, remaining, excess };
}

export function buildBreakdownRow(
  categoryId: string,
  categoryName: string,
  color: string | null,
  tracked: number,
  budget: number | null
): BudgetBreakdownRow {
  const metrics = computeBreakdownRow(tracked, budget);
  return {
    categoryId,
    categoryName,
    color,
    tracked,
    budget,
    ...metrics,
  };
}

export function sumBreakdownTotals(rows: BudgetBreakdownRow[]): BudgetBreakdownTotals {
  const tracked = rows.reduce((s, r) => s + r.tracked, 0);
  const withBudget = rows.filter((r) => r.budget != null && r.budget > 0);
  const budget =
    withBudget.length > 0 ? withBudget.reduce((s, r) => s + (r.budget ?? 0), 0) : null;
  const metrics = computeBreakdownRow(tracked, budget);
  return { tracked, budget, ...metrics };
}

export function buildDonutSlices(
  rows: BudgetBreakdownRow[],
  total: number,
  palette: string[]
): DonutSlice[] {
  const sorted = [...rows]
    .filter((r) => r.tracked > 0)
    .sort((a, b) => b.tracked - a.tracked);

  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6);
  const restTotal = rest.reduce((s, r) => s + r.tracked, 0);

  const slices: DonutSlice[] = top.map((r, i) => ({
    name: r.categoryName,
    value: r.tracked,
    pct: total > 0 ? Math.round((r.tracked / total) * 1000) / 10 : 0,
    color: r.color ?? palette[i % palette.length],
  }));

  if (restTotal > 0) {
    slices.push({
      name: "Pozostałe",
      value: restTotal,
      pct: total > 0 ? Math.round((restTotal / total) * 1000) / 10 : 0,
      color: "#94a3b8",
    });
  }

  return slices;
}

export function incomeDonutSlices(rows: BudgetBreakdownRow[], total: number) {
  return buildDonutSlices(rows, total, DONUT_COLORS);
}

export function expenseDonutSlices(rows: BudgetBreakdownRow[], total: number) {
  return buildDonutSlices(rows, total, DONUT_COLORS_EXPENSE);
}

export function performanceLabel(balance: number): { text: string; positive: boolean } {
  if (balance >= 0) {
    return { text: "Dobra robota ✓", positive: true };
  }
  return { text: "Uwaga: wydatki przekroczyły przychody", positive: false };
}

export function completionStatusClass(
  completionPct: number | null,
  isExpense: boolean
): "ok" | "warn" | "over" | "none" {
  if (completionPct == null) return "none";
  if (!isExpense) {
    if (completionPct >= 100) return "ok";
    if (completionPct >= 80) return "warn";
    return "none";
  }
  if (completionPct > 100) return "over";
  if (completionPct >= 80) return "warn";
  return "ok";
}
