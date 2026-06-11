/**
 * Kompatybilność wsteczna — filtry przeniesione do @/lib/transactions/filter-state.
 * Używane m.in. na stronie konta (/accounts/[id]).
 */
import type { TransactionFilterState } from "@/lib/transactions/filter-state";
import { buildTransactionsUrl } from "@/lib/transactions/filter-state";

export type { TransactionFilterState } from "@/lib/transactions/filter-state";

export function buildTransactionsPageUrl(state: TransactionFilterState, page: number): string {
  return buildTransactionsUrl(state, { page });
}

/** Minimalny pasek filtrów typu — tylko dla widoków osadzonych (np. konto). */
export function TransactionsFilters({
  state,
}: {
  state: TransactionFilterState;
  needsReviewCount?: number;
}) {
  const types = [
    { value: "all", label: "Wszystkie" },
    { value: "expense", label: "Wydatki" },
    { value: "income", label: "Przychody" },
    { value: "transfer", label: "Transfery" },
  ] as const;

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {types.map((t) => (
        <a
          key={t.value}
          href={buildTransactionsUrl(state, { type: t.value, page: 1 })}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            state.type === t.value
              ? "bg-primary text-white"
              : "border border-border bg-card text-muted hover:text-foreground"
          }`}
        >
          {t.label}
        </a>
      ))}
    </div>
  );
}
