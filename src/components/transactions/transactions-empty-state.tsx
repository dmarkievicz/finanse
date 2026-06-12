import { CalendarX } from "lucide-react";
import { EmptyState } from "@/components/layout";
import {
  clearAllFilters,
  isTodayPeriod,
  type TransactionFilterState,
} from "@/lib/transactions/filter-state";

interface TransactionsEmptyStateProps {
  filterState: TransactionFilterState;
  compact?: boolean;
}

export function TransactionsEmptyState({
  filterState,
  compact = false,
}: TransactionsEmptyStateProps) {
  const today = isTodayPeriod(filterState);

  return (
    <EmptyState
      icon={CalendarX}
      compact={compact}
      title={today ? "Brak transakcji dzisiaj" : "Brak transakcji w wybranym zakresie"}
      description={
        today
          ? "Nie dodano jeszcze żadnych transakcji z dzisiejszego dnia."
          : "Nie znaleziono transakcji dla aktualnych filtrów. Zmień zakres dat, wyczyść filtry albo dodaj nową transakcję."
      }
      actions={[
        ...(!today
          ? [
              {
                label: "Wyczyść filtry",
                href: clearAllFilters(filterState),
                variant: "secondary" as const,
              },
            ]
          : []),
        {
          label: "Dodaj transakcję",
          href: "/transactions/new",
          variant: "primary" as const,
        },
      ]}
    />
  );
}
