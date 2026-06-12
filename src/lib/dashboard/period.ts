import { resolvePeriodPreset, type DateRange } from "@/lib/transactions/date-presets";
import { formatDateRangeLabel } from "@/lib/transactions/date-presets";

export type DashboardPeriodPreset =
  | "this_month"
  | "prev_month"
  | "this_year"
  | "last_12_months"
  | "custom";
export type DashboardChartRange = "6" | "12" | "ytd";

export interface DashboardPeriod {
  preset: DashboardPeriodPreset;
  current: DateRange;
  previous: DateRange;
  label: string;
  monthKey: string;
}

function toLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

function previousPeriodRange(preset: DashboardPeriodPreset, current: DateRange): DateRange {
  if (preset === "this_month") return resolvePeriodPreset("prev_month");
  if (preset === "last_12_months") {
    const len = daysBetween(current.from, current.to);
    return shiftRange(current, len);
  }
  if (preset === "prev_month") {
    const prev = resolvePeriodPreset("prev_month");
    return shiftRange(prev, daysBetween(prev.from, prev.to));
  }
  if (preset === "this_year") return resolvePeriodPreset("prev_year");
  const len = daysBetween(current.from, current.to);
  return shiftRange(current, len);
}

export function parseDashboardPeriod(
  params: Record<string, string | undefined>,
  ref = new Date()
): DashboardPeriod {
  const raw = params.period ?? "this_month";
  const preset: DashboardPeriodPreset =
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
  } else if (preset === "last_12_months") {
    const start = new Date(ref.getFullYear(), ref.getMonth() - 11, 1);
    const endMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
    current = {
      from: toLocalDate(start),
      to: toLocalDate(endMonth),
    };
  } else {
    current = resolvePeriodPreset("this_year", ref);
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

  const monthKey = current.from.slice(0, 7);

  return { preset, current, previous, label, monthKey };
}

/** Krótka etykieta poprzedniego okresu do KPI, np. „maj 2026”. */
export function previousPeriodCompareLabel(period: DashboardPeriod): string {
  const d = new Date(period.previous.to + "T00:00:00");
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

export function dashboardSubtitle(period: DashboardPeriod): string {
  return `Podsumowanie finansów za ${period.label} · waluta bazowa PLN`;
}

export function parseChartRange(params: Record<string, string | undefined>): DashboardChartRange {
  const v = params.chart;
  if (v === "12" || v === "ytd") return v;
  return "6";
}

export function chartMonthsCount(range: DashboardChartRange, ref = new Date()): number {
  if (range === "12") return 12;
  if (range === "ytd") return ref.getMonth() + 1;
  return 6;
}

export function buildDashboardUrl(
  updates: Partial<{
    period: DashboardPeriodPreset;
    from: string;
    to: string;
    chart: DashboardChartRange;
  }>,
  base?: {
    period?: DashboardPeriodPreset;
    from?: string;
    to?: string;
    chart?: DashboardChartRange;
  }
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

  const chart = updates.chart ?? base?.chart;
  if (chart) params.set("chart", chart);

  const q = params.toString();
  return q ? `/dashboard?${q}` : "/dashboard";
}
