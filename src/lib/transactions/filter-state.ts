import type { TransactionType } from "@/types/database";
import {
  formatDateRangeLabel,
  isMorePeriodPreset,
  resolvePeriodPreset,
  type DateRange,
  type PeriodPreset,
} from "@/lib/transactions/date-presets";
import { monthRange } from "@/lib/format";

export type TransactionViewMode = "list" | "grouped" | "monthly";
export type TransactionSortField = "date" | "amount" | "category";

export interface TransactionFilterState {
  type: TransactionType | "all";
  period: PeriodPreset;
  dateFrom?: string;
  dateTo?: string;
  day?: string;
  accountId?: string;
  accountName?: string | null;
  sourceAccountId?: string;
  sourceAccountName?: string | null;
  targetAccountId?: string;
  targetAccountName?: string | null;
  categoryId?: string;
  categoryName?: string | null;
  subcategoryId?: string;
  subcategoryName?: string | null;
  currency?: string;
  amountMin?: number;
  amountMax?: number;
  search?: string;
  importOnly?: boolean;
  manualOnly?: boolean;
  includeReconciled?: boolean;
  view: TransactionViewMode;
  sort: TransactionSortField;
  sortDir: "asc" | "desc";
  page: number;
}

export const DEFAULT_PAGE_SIZE = 50;

export function resolveDateRange(state: TransactionFilterState): DateRange {
  if (state.day) {
    return { from: state.day, to: state.day };
  }
  if (state.period === "custom" && state.dateFrom && state.dateTo) {
    return { from: state.dateFrom, to: state.dateTo };
  }
  if (state.period === "custom") {
    return resolvePeriodPreset("this_month");
  }
  return resolvePeriodPreset(state.period);
}

/** Czy dany preset okresu jest aktywny w stanie filtrów (toolbar). */
export function isPeriodPresetActive(
  state: TransactionFilterState,
  preset: PeriodPreset
): boolean {
  if (state.day) return false;
  if (preset === "custom") {
    return state.period === "custom" && !!state.dateFrom && !!state.dateTo;
  }
  return state.period === preset && !state.dateFrom && !state.dateTo;
}

export function isTodayPeriod(state: TransactionFilterState): boolean {
  if (state.period === "today" && !state.day && !state.dateFrom) return true;
  const today = resolvePeriodPreset("today");
  return state.day === today.from;
}

export function parseTransactionFilters(
  params: Record<string, string | undefined>
): TransactionFilterState {
  const period = (params.period ?? "this_month") as PeriodPreset;
  const month = params.month;
  let dateFrom = params.from;
  let dateTo = params.to;

  if (month && !dateFrom && !dateTo) {
    const range = monthRange(month);
    if (range) {
      dateFrom = range.from;
      dateTo = range.to;
    }
  }

  return {
    type: (params.type ?? "all") as TransactionType | "all",
    period: dateFrom || dateTo || params.day ? "custom" : period,
    dateFrom,
    dateTo,
    day: params.day,
    accountId: params.account,
    sourceAccountId: params.source,
    targetAccountId: params.target,
    categoryId: params.category,
    subcategoryId: params.subcategory,
    currency: params.currency,
    amountMin: params.amountMin ? Number(params.amountMin) : undefined,
    amountMax: params.amountMax ? Number(params.amountMax) : undefined,
    search: params.q,
    importOnly: params.import === "1",
    manualOnly: params.manual === "1",
    includeReconciled: params.reconciled === "1",
    view: (params.view ?? "grouped") as TransactionViewMode,
    sort: (params.sort ?? "date") as TransactionSortField,
    sortDir: (params.dir ?? "desc") as "asc" | "desc",
    page: Math.max(1, Number(params.page ?? "1")),
  };
}

export function buildPeriodUrl(
  state: TransactionFilterState,
  period: PeriodPreset,
  custom?: { from: string; to: string }
): string {
  if (period === "custom" && custom) {
    return buildTransactionsUrl(state, {
      period: "custom",
      dateFrom: custom.from,
      dateTo: custom.to,
      day: undefined,
      page: 1,
    });
  }
  return buildTransactionsUrl(state, {
    period,
    dateFrom: undefined,
    dateTo: undefined,
    day: undefined,
    page: 1,
  });
}

export function buildTransactionsUrl(
  state: TransactionFilterState,
  overrides: Partial<TransactionFilterState> = {}
): string {
  const merged = { ...state, ...overrides };
  const params = new URLSearchParams();

  if (merged.page > 1) params.set("page", String(merged.page));
  if (merged.type !== "all") params.set("type", merged.type);
  if (merged.period && merged.period !== "this_month") params.set("period", merged.period);
  if (merged.day) params.set("day", merged.day);
  if (merged.period === "custom") {
    if (merged.dateFrom) params.set("from", merged.dateFrom);
    if (merged.dateTo) params.set("to", merged.dateTo);
  }
  if (merged.accountId) params.set("account", merged.accountId);
  if (merged.sourceAccountId) params.set("source", merged.sourceAccountId);
  if (merged.targetAccountId) params.set("target", merged.targetAccountId);
  if (merged.categoryId) params.set("category", merged.categoryId);
  if (merged.subcategoryId) params.set("subcategory", merged.subcategoryId);
  if (merged.currency) params.set("currency", merged.currency);
  if (merged.amountMin != null) params.set("amountMin", String(merged.amountMin));
  if (merged.amountMax != null) params.set("amountMax", String(merged.amountMax));
  if (merged.search) params.set("q", merged.search);
  if (merged.importOnly) params.set("import", "1");
  if (merged.manualOnly) params.set("manual", "1");
  if (merged.includeReconciled) params.set("reconciled", "1");
  if (merged.view !== "grouped") params.set("view", merged.view);
  if (merged.sort !== "date") params.set("sort", merged.sort);
  if (merged.sortDir !== "desc") params.set("dir", merged.sortDir);

  const qs = params.toString();
  return `/transactions${qs ? `?${qs}` : ""}`;
}

export function buildTransactionsPageUrl(state: TransactionFilterState, page: number): string {
  return buildTransactionsUrl(state, { page });
}

export function clearAllFilters(state: TransactionFilterState): string {
  return buildTransactionsUrl({
    ...state,
    type: "all",
    period: "this_month",
    dateFrom: undefined,
    dateTo: undefined,
    day: undefined,
    accountId: undefined,
    accountName: undefined,
    sourceAccountId: undefined,
    sourceAccountName: undefined,
    targetAccountId: undefined,
    targetAccountName: undefined,
    categoryId: undefined,
    categoryName: undefined,
    subcategoryId: undefined,
    subcategoryName: undefined,
    currency: undefined,
    amountMin: undefined,
    amountMax: undefined,
    search: undefined,
    importOnly: false,
    manualOnly: false,
    includeReconciled: false,
    page: 1,
  });
}

export function periodLabel(state: TransactionFilterState): string {
  const range = resolveDateRange(state);
  if (state.period === "custom" && state.dateFrom && state.dateTo) {
    return formatDateRangeLabel(range.from, range.to, "custom");
  }
  if (state.day) {
    return formatDateRangeLabel(range.from, range.to);
  }
  return formatDateRangeLabel(range.from, range.to, state.period);
}

export function activeFilterCount(state: TransactionFilterState): number {
  let n = 0;
  if (state.accountId) n++;
  if (state.sourceAccountId) n++;
  if (state.targetAccountId) n++;
  if (state.categoryId) n++;
  if (state.subcategoryId) n++;
  if (state.currency) n++;
  if (state.amountMin != null || state.amountMax != null) n++;
  if (state.search) n++;
  if (state.importOnly) n++;
  if (state.manualOnly) n++;
  if (state.includeReconciled) n++;
  if (state.day) n++;
  return n;
}

export function isMoreMenuActive(state: TransactionFilterState): boolean {
  return isMorePeriodPreset(state.period) && !state.day && !state.dateFrom;
}

/** Zapisane widoki — struktura pod przyszłe rozszerzenie. */
export function buildTransactionsExportUrl(state: TransactionFilterState): string {
  const pageUrl = buildTransactionsUrl(state, { page: 1 });
  const qs = pageUrl.includes("?") ? pageUrl.split("?")[1] : "";
  return `/api/transactions/export${qs ? `?${qs}` : ""}`;
}

export const SAVED_VIEWS = [
  { id: "this_month", label: "Ten miesiąc", preset: "this_month" as PeriodPreset },
  { id: "prev_month", label: "Poprzedni miesiąc", preset: "prev_month" as PeriodPreset },
  { id: "transfers", label: "Transfery", type: "transfer" as const },
] as const;
