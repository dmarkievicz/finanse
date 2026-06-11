import Link from "next/link";
import { X } from "lucide-react";
import {
  buildTransactionsUrl,
  periodLabel,
  type TransactionFilterState,
} from "@/lib/transactions/filter-state";

function Badge({ label, clearHref }: { label: string; clearHref: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
      {label}
      <Link href={clearHref} className="rounded p-0.5 hover:bg-primary/20" title="Usuń filtr">
        <X className="h-3.5 w-3.5" />
      </Link>
    </span>
  );
}

export function TransactionsActiveFilters({ state }: { state: TransactionFilterState }) {
  const badges: { label: string; clearHref: string }[] = [];

  if (state.day) {
    badges.push({
      label: `Dzień: ${state.day}`,
      clearHref: buildTransactionsUrl(state, { day: undefined, page: 1 }),
    });
  } else if (state.period !== "this_month" || state.dateFrom || state.dateTo) {
    badges.push({
      label: `Okres: ${periodLabel(state)}`,
      clearHref: buildTransactionsUrl(state, {
        period: "this_month",
        dateFrom: undefined,
        dateTo: undefined,
        page: 1,
      }),
    });
  }

  if (state.accountId && state.accountName) {
    badges.push({
      label: `Konto: ${state.accountName}`,
      clearHref: buildTransactionsUrl(state, { accountId: undefined, accountName: undefined, page: 1 }),
    });
  }
  if (state.sourceAccountId && state.sourceAccountName) {
    badges.push({
      label: `Źródło: ${state.sourceAccountName}`,
      clearHref: buildTransactionsUrl(state, {
        sourceAccountId: undefined,
        sourceAccountName: undefined,
        page: 1,
      }),
    });
  }
  if (state.targetAccountId && state.targetAccountName) {
    badges.push({
      label: `Cel: ${state.targetAccountName}`,
      clearHref: buildTransactionsUrl(state, {
        targetAccountId: undefined,
        targetAccountName: undefined,
        page: 1,
      }),
    });
  }
  if (state.categoryId && state.categoryName) {
    badges.push({
      label: `Kategoria: ${state.categoryName}`,
      clearHref: buildTransactionsUrl(state, { categoryId: undefined, categoryName: undefined, page: 1 }),
    });
  }
  if (state.subcategoryId && state.subcategoryName) {
    badges.push({
      label: `Podkategoria: ${state.subcategoryName}`,
      clearHref: buildTransactionsUrl(state, {
        subcategoryId: undefined,
        subcategoryName: undefined,
        page: 1,
      }),
    });
  }
  if (state.currency) {
    badges.push({
      label: `Waluta: ${state.currency}`,
      clearHref: buildTransactionsUrl(state, { currency: undefined, page: 1 }),
    });
  }
  if (state.amountMin != null || state.amountMax != null) {
    badges.push({
      label: `Kwota: ${state.amountMin ?? "0"}–${state.amountMax ?? "∞"} PLN`,
      clearHref: buildTransactionsUrl(state, { amountMin: undefined, amountMax: undefined, page: 1 }),
    });
  }
  if (state.search) {
    badges.push({
      label: `Szukaj: „${state.search}"`,
      clearHref: buildTransactionsUrl(state, { search: undefined, page: 1 }),
    });
  }
  if (state.importOnly) {
    badges.push({
      label: "Tylko import",
      clearHref: buildTransactionsUrl(state, { importOnly: false, page: 1 }),
    });
  }
  if (state.manualOnly) {
    badges.push({
      label: "Tylko ręczne",
      clearHref: buildTransactionsUrl(state, { manualOnly: false, page: 1 }),
    });
  }
  if (state.includeReconciled) {
    badges.push({
      label: "Z archiwalnymi",
      clearHref: buildTransactionsUrl(state, { includeReconciled: false, page: 1 }),
    });
  }
  if (state.sort !== "date" || state.sortDir !== "desc") {
    const sortLabels = { date: "Data", amount: "Kwota", category: "Kategoria" };
    badges.push({
      label: `Sort: ${sortLabels[state.sort]} ${state.sortDir === "asc" ? "↑" : "↓"}`,
      clearHref: buildTransactionsUrl(state, { sort: "date", sortDir: "desc", page: 1 }),
    });
  }

  if (!badges.length) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {badges.map((b) => (
        <Badge key={b.label} label={b.label} clearHref={b.clearHref} />
      ))}
    </div>
  );
}
