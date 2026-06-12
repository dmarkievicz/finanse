/** Zakresy dat dla szybkiego wyboru okresu na liście transakcji. */

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "prev_month"
  | "this_year"
  | "prev_year"
  | "custom";

export interface DateRange {
  from: string;
  to: string;
}

/** ISO date (YYYY-MM-DD) w lokalnej strefie użytkownika — bez przesunięć UTC. */
function toLocalIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function resolvePeriodPreset(preset: PeriodPreset, ref = new Date()): DateRange {
  const y = ref.getFullYear();
  const m = ref.getMonth();

  switch (preset) {
    case "today":
      return { from: toLocalIso(ref), to: toLocalIso(ref) };
    case "yesterday": {
      const d = new Date(ref);
      d.setDate(d.getDate() - 1);
      return { from: toLocalIso(d), to: toLocalIso(d) };
    }
    case "this_week": {
      const start = startOfWeek(ref);
      return { from: toLocalIso(start), to: toLocalIso(ref) };
    }
    case "this_month":
      return {
        from: `${y}-${String(m + 1).padStart(2, "0")}-01`,
        to: toLocalIso(new Date(y, m + 1, 0)),
      };
    case "prev_month":
      return {
        from: `${y}-${String(m).padStart(2, "0")}-01`,
        to: toLocalIso(new Date(y, m, 0)),
      };
    case "this_year":
      return { from: `${y}-01-01`, to: `${y}-12-31` };
    case "prev_year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:
      return resolvePeriodPreset("this_month", ref);
  }
}

export const PRIMARY_PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Dzisiaj" },
  { value: "this_month", label: "Ten miesiąc" },
  { value: "prev_month", label: "Poprzedni miesiąc" },
  { value: "this_year", label: "Ten rok" },
  { value: "custom", label: "Zakres własny" },
];

export const MORE_PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "yesterday", label: "Wczoraj" },
  { value: "this_week", label: "Ten tydzień" },
  { value: "prev_year", label: "Poprzedni rok" },
];

/** Wszystkie presety — kompatybilność wsteczna. */
export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  ...PRIMARY_PERIOD_PRESETS.slice(0, -1),
  ...MORE_PERIOD_PRESETS,
  { value: "custom", label: "Zakres własny" },
];

const MORE_PRESET_VALUES = new Set(MORE_PERIOD_PRESETS.map((p) => p.value));

export function isMorePeriodPreset(preset: PeriodPreset): boolean {
  return MORE_PRESET_VALUES.has(preset);
}

export function validateCustomDateRange(from: string, to: string): string | null {
  if (!from || !to) return "Wybierz obie daty zakresu.";
  if (from > to) return "Data „od” nie może być późniejsza niż data „do”.";
  return null;
}

export function formatDateRangeLabel(from?: string, to?: string, preset?: PeriodPreset): string {
  if (preset && preset !== "custom") {
    const match = PERIOD_PRESETS.find((p) => p.value === preset);
    if (match) return match.label;
  }
  if (from && to) {
    if (from === to) {
      return new Intl.DateTimeFormat("pl-PL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(from + "T00:00:00"));
    }
    const f = new Intl.DateTimeFormat("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(from + "T00:00:00"));
    const t = new Intl.DateTimeFormat("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(to + "T00:00:00"));
    return `${f} – ${t}`;
  }
  return "Wszystkie daty";
}
