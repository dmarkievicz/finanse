"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, List, Loader2 } from "lucide-react";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import type { TransactionListItem } from "@/lib/queries/transactions";
import type { TransactionFilterState } from "@/lib/transactions/filter-state";
import { DEFAULT_PAGE_SIZE } from "@/lib/transactions/filter-state";
import { cn } from "@/lib/utils";

interface AccountTransactionsSectionProps {
  accountId: string;
  accountName: string;
  transactionCount: number;
}

export function AccountTransactionsSection({
  accountId,
  accountName,
  transactionCount,
}: AccountTransactionsSectionProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<TransactionListItem[]>([]);
  const [total, setTotal] = useState(transactionCount);
  const [page, setPage] = useState(1);

  const filterState: TransactionFilterState = {
    type: "all",
    period: "custom",
    accountId,
    accountName,
    view: "list",
    sort: "date",
    sortDir: "desc",
    page,
    includeReconciled: true,
  };

  const loadPage = useCallback(
    async (nextPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/accounts/${accountId}/transactions?page=${nextPage}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Błąd ładowania");
        setItems(data.items);
        setTotal(data.total);
        setPage(data.page);
        setLoaded(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Błąd ładowania transakcji");
      } finally {
        setLoading(false);
      }
    },
    [accountId]
  );

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) void loadPage(1);
  }

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-slate-50/80"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <List className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">Transakcje</p>
          <p className="text-[13px] text-muted">
            {transactionCount.toLocaleString("pl-PL")} operacji na tym koncie
          </p>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 shrink-0 text-muted transition", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 pb-4 pt-2">
          <div className="mb-3 flex justify-end">
            <Link
              href={`/transactions?account=${accountId}`}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:underline"
            >
              Pełna lista z filtrami
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading && !loaded ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
              Ładowanie transakcji…
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              <button
                type="button"
                onClick={() => void loadPage(page)}
                className="ml-2 font-medium underline"
              >
                Spróbuj ponownie
              </button>
            </div>
          ) : (
            <TransactionsTable
              items={items}
              total={total}
              page={page}
              pageSize={DEFAULT_PAGE_SIZE}
              filterState={filterState}
              onPageChange={(p) => void loadPage(p)}
            />
          )}
        </div>
      )}
    </section>
  );
}
