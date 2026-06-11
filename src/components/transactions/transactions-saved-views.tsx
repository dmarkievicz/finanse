"use client";

import { useEffect, useState } from "react";
import { Bookmark, Trash2 } from "lucide-react";
import type { TransactionFilterState } from "@/lib/transactions/filter-state";
import { buildTransactionsUrl } from "@/lib/transactions/filter-state";

const STORAGE_KEY = "finanse_saved_transaction_views";

interface SavedView {
  id: string;
  label: string;
  state: Partial<TransactionFilterState>;
}

interface TransactionsSavedViewsProps {
  filterState: TransactionFilterState;
}

export function TransactionsSavedViews({ filterState }: TransactionsSavedViewsProps) {
  const [views, setViews] = useState<SavedView[]>([]);
  const [label, setLabel] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setViews(JSON.parse(raw) as SavedView[]);
    } catch {
      setViews([]);
    }
  }, []);

  function persist(next: SavedView[]) {
    setViews(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function saveCurrent() {
    const name = label.trim();
    if (!name) return;
    const entry: SavedView = {
      id: crypto.randomUUID(),
      label: name,
      state: {
        type: filterState.type,
        period: filterState.period,
        dateFrom: filterState.dateFrom,
        dateTo: filterState.dateTo,
        accountId: filterState.accountId,
        sourceAccountId: filterState.sourceAccountId,
        targetAccountId: filterState.targetAccountId,
        categoryId: filterState.categoryId,
        subcategoryId: filterState.subcategoryId,
        currency: filterState.currency,
        amountMin: filterState.amountMin,
        amountMax: filterState.amountMax,
        search: filterState.search,
        importOnly: filterState.importOnly,
        manualOnly: filterState.manualOnly,
        view: filterState.view,
        sort: filterState.sort,
        sortDir: filterState.sortDir,
      },
    };
    persist([entry, ...views].slice(0, 12));
    setLabel("");
  }

  function remove(id: string) {
    persist(views.filter((v) => v.id !== id));
  }

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted">
        <Bookmark className="h-3.5 w-3.5" />
        Zapisane widoki
      </p>
      <div className="flex flex-wrap gap-2">
        {views.map((v) => (
          <span key={v.id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 pl-2 pr-1">
            <a
              href={buildTransactionsUrl(filterState, { ...v.state, page: 1 })}
              className="text-xs font-medium text-slate-700 hover:underline"
            >
              {v.label}
            </a>
            <button
              type="button"
              onClick={() => remove(v.id)}
              className="rounded p-0.5 text-slate-500 hover:bg-slate-200"
              title="Usuń widok"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nazwa widoku…"
          className="min-w-0 flex-1 rounded-lg border border-border px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={saveCurrent}
          disabled={!label.trim()}
          className="rounded-lg border border-border px-2 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          Zapisz widok
        </button>
      </div>
    </div>
  );
}
