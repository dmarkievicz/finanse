import { resolvePeriodPreset, type DateRange } from "@/lib/transactions/date-presets";
import { formatDateRangeLabel } from "@/lib/transactions/date-presets";

export type CategoriesPeriodPreset =
  | "this_month"
  | "prev_month"
  | "this_year"
  | "last_12_months"
  | "custom";

export interface CategoriesPeriod {
  preset: CategoriesPeriodPreset;
  current: DateRange;
  previous: DateRange;
  label: string;
  monthKey: string;
  budgetYear: number;
  budgetMonth: number;
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

function shiftRange(range: DateRange, deltaDays: number): DateRange {
  const from = new Date(range.from + "T00:00:00");
  const to = new Date(range.to + "T00:00:00");
  from.setDate(from.getDate() - deltaDays);
  to.setDate(to.getDate() - deltaDays);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function last12MonthsRange(ref = new Date()): DateRange {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const to = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  const fromDate = new Date(y, m - 11, 1);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

function previousPeriodRange(preset: CategoriesPeriodPreset, current: DateRange): DateRange {
  if (preset === "this_month") return resolvePeriodPreset("prev_month");
  if (preset === "prev_month") {
    const prev = resolvePeriodPreset("prev_month");
    return shiftRange(prev, daysBetween(prev.from, prev.to));
  }
  if (preset === "this_year") return resolvePeriodPreset("prev_year");
  if (preset === "last_12_months") {
    const len = daysBetween(current.from, current.to);
    return shiftRange(current, len);
  }
  const len = daysBetween(current.from, current.to);
  return shiftRange(current, len);
}

export function parseCategoriesPeriod(
  params: Record<string, string | undefined>,
  ref = new Date()
): CategoriesPeriod {
  const raw = params.period ?? "this_month";
  const preset: CategoriesPeriodPreset =
    raw === "prev_month" ||
    raw === "this_year" ||
    raw === "last_12_months" ||
    raw === "custom"
      ? raw
      : "this_month";

  let current: DateRange;
  if (preset === "custom" && params.from && params.to) {
    current = { from: params.from, to: params.to };
  } else if (preset === "this_month") {
    current = resolvePeriodPreset("this_month", ref);
  } else if (preset === "prev_month") {
    current = resolvePeriodPreset("prev_month", ref);
  } else if (preset === "this_year") {
    current = resolvePeriodPreset("this_year", ref);
  } else {
    current = last12MonthsRange(ref);
  }

  const previous = previousPeriodRange(preset, current);
  const label =
    preset === "custom"
      ? formatDateRangeLabel(current.from, current.to, "custom")
      : preset === "last_12_months"
        ? "Ostatnie 12 miesięcy"
        : formatDateRangeLabel(
            current.from,
            current.to,
            preset === "this_year" ? "this_year" : preset
          );

  const endDate = new Date(current.to + "T00:00:00");

  return {
    preset,
    current,
    previous,
    label,
    monthKey: current.to.slice(0, 7),
    budgetYear: endDate.getFullYear(),
    budgetMonth: endDate.getMonth() + 1,
  };
}

export function buildCategoriesUrl(
  updates: Partial<{
    period: CategoriesPeriodPreset;
    from: string;
    to: string;
    tab: string;
    showEmpty: boolean;
    q: string;
    sort: string;
    dir: string;
    min: string;
    max: string;
  }>,
  base?: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  const period = updates.period ?? base?.period ?? "this_month";
  params.set("period", period);

  if (period === "custom") {
    const from = updates.from ?? base?.from;
    const to = updates.to ?? base?.to;
    if (from) params.set("from", from);
    if (to) params.set("to", to);
  }

  const tab = updates.tab ?? base?.tab;
  if (tab && tab !== "expense") params.set("tab", tab);

  if (updates.showEmpty ?? base?.showEmpty === "1") params.set("showEmpty", "1");
  const q = updates.q ?? base?.q;
  if (q) params.set("q", q);
  const sort = updates.sort ?? base?.sort;
  if (sort) params.set("sort", sort);
  const dir = updates.dir ?? base?.dir;
  if (dir) params.set("dir", dir);
  const min = updates.min ?? base?.min;
  if (min) params.set("min", min);
  const max = updates.max ?? base?.max;
  if (max) params.set("max", max);

  const qs = params.toString();
  return qs ? `/categories?${qs}` : "/categories";
}
