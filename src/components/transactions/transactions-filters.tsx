import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMonthLabel } from "@/lib/format";

export interface TransactionFilterState {
  type: string;
  reviewOnly: boolean;
  accountId?: string;
  accountName?: string | null;
  categoryId?: string;
  categoryName?: string | null;
  month?: string;
  status?: string;
  search?: string;
}

const types = [
  { value: "all", label: "Wszystkie" },
  { value: "expense", label: "Wydatki" },
  { value: "income", label: "Przychody" },
  { value: "transfer", label: "Transfery" },
];

function buildUrl(state: TransactionFilterState, overrides: Partial<TransactionFilterState> = {}) {
  const merged = { ...state, ...overrides };
  const params = new URLSearchParams();
  if (merged.type !== "all") params.set("type", merged.type);
  if (merged.reviewOnly) params.set("review", "1");
  if (merged.accountId) params.set("account", merged.accountId);
  if (merged.categoryId) params.set("category", merged.categoryId);
  if (merged.month) params.set("month", merged.month);
  if (merged.status && merged.status !== "all") params.set("status", merged.status);
  if (merged.search) params.set("q", merged.search);
  const qs = params.toString();
  return `/transactions${qs ? `?${qs}` : ""}`;
}

function FilterBadge({
  label,
  clearHref,
}: {
  label: string;
  clearHref: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
      {label}
      <Link href={clearHref} className="ml-1 rounded p-0.5 hover:bg-primary/20" title="Usuń filtr">
        <X className="h-3.5 w-3.5" />
      </Link>
    </span>
  );
}

export function TransactionsFilters({
  state,
  needsReviewCount,
}: {
  state: TransactionFilterState;
  needsReviewCount: number;
}) {
  return (
    <div className="mb-4 space-y-2">
      {(state.accountId || state.categoryId || state.month) && (
        <div className="flex flex-wrap items-center gap-2">
          {state.accountId && state.accountName && (
            <FilterBadge
              label={`Konto: ${state.accountName}`}
              clearHref={buildUrl(state, { accountId: undefined, accountName: undefined })}
            />
          )}
          {state.categoryId && state.categoryName && (
            <FilterBadge
              label={`Kategoria: ${state.categoryName}`}
              clearHref={buildUrl(state, { categoryId: undefined, categoryName: undefined })}
            />
          )}
          {state.month && (
            <FilterBadge
              label={`Miesiąc: ${formatMonthLabel(state.month)}`}
              clearHref={buildUrl(state, { month: undefined })}
            />
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {types.map((t) => (
          <Link
            key={t.value}
            href={buildUrl(state, { type: t.value })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              state.type === t.value
                ? "bg-primary text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        ))}
        <span className="mx-1 text-border">|</span>
        {statuses.map((s) => (
          <Link
            key={s.value}
            href={buildUrl(state, { status: s.value })}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition",
              (state.status ?? "all") === s.value
                ? "bg-slate-700 text-white"
                : "border border-border bg-card text-muted hover:text-foreground"
            )}
          >
            {s.label}
          </Link>
        ))}
        <span className="mx-1 text-border">|</span>
        <Link
          href="/transactions/review"
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition",
            "border border-border bg-card text-muted hover:text-foreground",
            needsReviewCount > 0 && "border-red-200 text-red-700"
          )}
        >
          Do poprawy
          {needsReviewCount > 0 && (
            <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
              {needsReviewCount}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}

export function buildTransactionsPageUrl(
  state: TransactionFilterState,
  page: number
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (state.type !== "all") params.set("type", state.type);
  if (state.reviewOnly) params.set("review", "1");
  if (state.accountId) params.set("account", state.accountId);
  if (state.categoryId) params.set("category", state.categoryId);
  if (state.month) params.set("month", state.month);
  if (state.status && state.status !== "all") params.set("status", state.status);
  if (state.search) params.set("q", state.search);
  const qs = params.toString();
  return `/transactions${qs ? `?${qs}` : ""}`;
}

const statuses = [
  { value: "all", label: "Wszystkie statusy" },
  { value: "confirmed", label: "Potwierdzone" },
  { value: "reconciled", label: "Pominięte (archiwalne)" },
  { value: "needs_review", label: "Do poprawy" },
];
