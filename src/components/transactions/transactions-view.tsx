"use client";

import { useState } from "react";
import type { TransactionListItem } from "@/lib/queries/transactions";
import type {
  DailyBreakdownRow,
  TransactionSummary,
} from "@/lib/queries/transaction-summary";
import { TransactionsActiveFilters } from "@/components/transactions/transactions-active-filters";
import {
  activeFilterCount,
  type TransactionFilterState,
} from "@/lib/transactions/filter-state";
import { TransactionsToolbar } from "@/components/transactions/transactions-toolbar";
import { TransactionsAdvancedFilters } from "@/components/transactions/transactions-advanced-filters";
import { TransactionsSummaryCards } from "@/components/transactions/transactions-summary-cards";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionsMonthlyView } from "@/components/transactions/transactions-monthly-view";
import { TransactionDetailDrawer } from "@/components/transactions/transaction-detail-drawer";

interface LookupData {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  subcategories: { id: string; name: string; category_id: string }[];
}

interface TransactionsViewProps {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
  filterState: TransactionFilterState;
  summary: TransactionSummary;
  dailyBreakdown: DailyBreakdownRow[];
  lookup: LookupData;
}

export function TransactionsView({
  items,
  total,
  page,
  pageSize,
  filterState,
  summary,
  dailyBreakdown,
  lookup,
}: TransactionsViewProps) {
  const [filtersOpen, setFiltersOpen] = useState(
    activeFilterCount(filterState) > 0
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div>
      <TransactionsToolbar
        filterState={filterState}
        total={summary.txCount || total}
        activeFilterCount={activeFilterCount(filterState)}
        onToggleFilters={() => setFiltersOpen((o) => !o)}
        filtersOpen={filtersOpen}
      />

      <TransactionsAdvancedFilters
        filterState={filterState}
        lookup={lookup}
        open={filtersOpen}
      />

      <TransactionsActiveFilters state={filterState} />

      <TransactionsSummaryCards summary={summary} />

      {filterState.view === "monthly" ? (
        <TransactionsMonthlyView days={dailyBreakdown} filterState={filterState} />
      ) : (
        <TransactionsTable
          items={items}
          total={total}
          page={page}
          pageSize={pageSize}
          filterState={filterState}
          grouped={filterState.view === "grouped"}
          onSelect={setSelectedId}
        />
      )}

      <TransactionDetailDrawer
        transactionId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
