export const MONTH_NAMES_PL = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
] as const;

export type BudgetYearParam = "current" | "all" | number;
export type BudgetPeriodParam = "total_year" | "current_month" | "all_history" | number;

export interface BudgetDashboardSelection {
  yearParam: BudgetYearParam;
  periodParam: BudgetPeriodParam;
  resolvedYear: number | null;
  resolvedMonth: number | null;
  from: string;
  to: string;
  isAllData: boolean;
  isTotalYear: boolean;
  isSingleMonth: boolean;
  yearLabel: string;
  periodLabel: string;
  breakdownTitle: string;
  summaryTitle: string;
}

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function monthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month, 0).getDate();
  return {
    from: `${year}-${String(month).padStart(2, "0")}-01`,
    to: `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

function parseYearParam(raw: string | undefined): BudgetYearParam {
  if (raw === "all") return "all";
  if (!raw || raw === "current") return "current";
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1900 && n <= 2100) return n;
  return "current";
}

function parsePeriodParam(raw: string | undefined, isAllData: boolean): BudgetPeriodParam {
  if (isAllData) return "all_history";
  if (!raw || raw === "current_month") return "current_month";
  if (raw === "total_year") return "total_year";
  const n = Number(raw);
  if (Number.isInteger(n) && n >= 1 && n <= 12) return n;
  return "current_month";
}

export function parseBudgetDashboardParams(
  params: Record<string, string | undefined>,
  ref = new Date()
): BudgetDashboardSelection {
  const yearParam = parseYearParam(params.year);
  const isAllData = yearParam === "all";
  const periodParam = parsePeriodParam(params.period, isAllData);

  const resolvedYear =
    yearParam === "all" ? null : yearParam === "current" ? ref.getFullYear() : yearParam;

  let resolvedMonth: number | null = null;
  let from = "";
  let to = toLocalDate(ref);

  if (isAllData) {
    from = "1970-01-01";
    to = toLocalDate(ref);
  } else if (periodParam === "total_year") {
    const range = yearRange(resolvedYear!);
    from = range.from;
    to = range.to;
  } else {
    const month =
      periodParam === "current_month"
        ? ref.getMonth() + 1
        : (periodParam as number);
    resolvedMonth = month;
    const range = monthRange(resolvedYear!, month);
    from = range.from;
    to = range.to;
  }

  const isTotalYear = !isAllData && periodParam === "total_year";
  const isSingleMonth = !isAllData && !isTotalYear;

  const yearLabel = isAllData
    ? "Cała historia"
    : yearParam === "current"
      ? `Bieżący rok (${resolvedYear})`
      : String(resolvedYear);

  let periodLabel: string;
  if (isAllData) {
    periodLabel = "Cała historia";
  } else if (isTotalYear) {
    periodLabel = "Cały rok";
  } else if (periodParam === "current_month") {
    periodLabel = MONTH_NAMES_PL[resolvedMonth! - 1];
  } else {
    periodLabel = MONTH_NAMES_PL[(periodParam as number) - 1];
  }

  const breakdownTitle = isAllData
    ? "Breakdown – cała historia"
    : isTotalYear
      ? `Breakdown – ${resolvedYear}`
      : `Breakdown – ${periodLabel} ${resolvedYear}`;

  const summaryTitle = breakdownTitle.replace("Breakdown", "Summary");

  return {
    yearParam,
    periodParam,
    resolvedYear,
    resolvedMonth,
    from,
    to,
    isAllData,
    isTotalYear,
    isSingleMonth,
    yearLabel,
    periodLabel,
    breakdownTitle,
    summaryTitle,
  };
}

/** Ułamek minionego okresu (0–100) — dla miesiąca: dni; dla roku: miesiące. */
export function periodCompletionPct(selection: BudgetDashboardSelection, ref = new Date()): number | null {
  if (selection.isAllData) return null;

  const today = toLocalDate(ref);
  const year = ref.getFullYear();
  const month = ref.getMonth() + 1;
  const day = ref.getDate();

  if (selection.isTotalYear) {
    const y = selection.resolvedYear!;
    if (y < year) return 100;
    if (y > year) return 0;
    return Math.round((month / 12) * 100);
  }

  const m = selection.resolvedMonth!;
  const y = selection.resolvedYear!;
  const periodEnd = selection.to;
  if (today < selection.from) return 0;
  if (today > periodEnd) return 100;

  const daysInMonth = new Date(y, m, 0).getDate();
  return Math.round((day / daysInMonth) * 100);
}

export function buildBudgetDashboardUrl(
  updates: { year?: string; period?: string },
  current?: { year?: string; period?: string }
): string {
  const params = new URLSearchParams();
  const year = updates.year ?? current?.year ?? "current";
  let period = updates.period ?? current?.period ?? "current_month";
  if (year === "all") period = "all_history";
  params.set("year", year);
  params.set("period", period);
  return `/dashboard?${params.toString()}`;
}
