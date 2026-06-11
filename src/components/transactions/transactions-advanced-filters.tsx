"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { ACCOUNT_CURRENCIES } from "@/lib/accounts/patch-fields";
import {
  buildTransactionsUrl,
  clearAllFilters,
  type TransactionFilterState,
} from "@/lib/transactions/filter-state";
import { SAVED_VIEWS } from "@/lib/transactions/filter-state";
import { TransactionsSavedViews } from "@/components/transactions/transactions-saved-views";

interface LookupData {
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  subcategories: { id: string; name: string; category_id: string }[];
}

interface TransactionsAdvancedFiltersProps {
  filterState: TransactionFilterState;
  lookup: LookupData;
  open: boolean;
}

export function TransactionsAdvancedFilters({
  filterState,
  lookup,
  open,
}: TransactionsAdvancedFiltersProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    dateFrom: filterState.dateFrom ?? "",
    dateTo: filterState.dateTo ?? "",
    day: filterState.day ?? "",
    accountId: filterState.accountId ?? "",
    sourceAccountId: filterState.sourceAccountId ?? "",
    targetAccountId: filterState.targetAccountId ?? "",
    categoryId: filterState.categoryId ?? "",
    subcategoryId: filterState.subcategoryId ?? "",
    currency: filterState.currency ?? "",
    amountMin: filterState.amountMin?.toString() ?? "",
    amountMax: filterState.amountMax?.toString() ?? "",
    search: filterState.search ?? "",
    importOnly: filterState.importOnly ?? false,
    manualOnly: filterState.manualOnly ?? false,
    includeReconciled: filterState.includeReconciled ?? false,
  });

  const filteredSubs = form.categoryId
    ? lookup.subcategories.filter((s) => s.category_id === form.categoryId)
    : lookup.subcategories;

  function apply() {
    setLoading(true);
    const params: Partial<TransactionFilterState> = {
      period: form.day || form.dateFrom || form.dateTo ? "custom" : filterState.period,
      day: form.day || undefined,
      dateFrom: form.dateFrom || undefined,
      dateTo: form.dateTo || undefined,
      accountId: form.accountId || undefined,
      sourceAccountId: form.sourceAccountId || undefined,
      targetAccountId: form.targetAccountId || undefined,
      categoryId: form.categoryId || undefined,
      subcategoryId: form.subcategoryId || undefined,
      currency: form.currency || undefined,
      amountMin: form.amountMin ? Number(form.amountMin) : undefined,
      amountMax: form.amountMax ? Number(form.amountMax) : undefined,
      search: form.search || undefined,
      importOnly: form.importOnly,
      manualOnly: form.manualOnly,
      includeReconciled: form.includeReconciled,
      page: 1,
    };
    router.push(buildTransactionsUrl(filterState, params));
    setLoading(false);
  }

  if (!open) return null;

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Zaawansowane filtry</h2>
        <a
          href={clearAllFilters(filterState)}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Wyczyść wszystko
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="text-xs font-medium text-muted">Konkretny dzień</label>
          <input
            type="date"
            value={form.day}
            onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Data od</label>
          <input
            type="date"
            value={form.dateFrom}
            onChange={(e) => setForm((f) => ({ ...f, dateFrom: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Data do</label>
          <input
            type="date"
            value={form.dateTo}
            onChange={(e) => setForm((f) => ({ ...f, dateTo: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Konto</label>
          <select
            value={form.accountId}
            onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">— wszystkie —</option>
            {lookup.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Konto źródłowe</label>
          <select
            value={form.sourceAccountId}
            onChange={(e) => setForm((f) => ({ ...f, sourceAccountId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">— dowolne —</option>
            {lookup.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Konto docelowe</label>
          <select
            value={form.targetAccountId}
            onChange={(e) => setForm((f) => ({ ...f, targetAccountId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">— dowolne —</option>
            {lookup.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Kategoria</label>
          <select
            value={form.categoryId}
            onChange={(e) =>
              setForm((f) => ({ ...f, categoryId: e.target.value, subcategoryId: "" }))
            }
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">— wszystkie —</option>
            {lookup.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Podkategoria</label>
          <select
            value={form.subcategoryId}
            onChange={(e) => setForm((f) => ({ ...f, subcategoryId: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">— wszystkie —</option>
            {filteredSubs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Waluta</label>
          <select
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">— wszystkie —</option>
            {ACCOUNT_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Kwota od (PLN)</label>
          <input
            type="number"
            min={0}
            value={form.amountMin}
            onChange={(e) => setForm((f) => ({ ...f, amountMin: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted">Kwota do (PLN)</label>
          <input
            type="number"
            min={0}
            value={form.amountMax}
            onChange={(e) => setForm((f) => ({ ...f, amountMax: e.target.value }))}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="text-xs font-medium text-muted">Szukaj w opisie / szczegółach</label>
          <input
            type="search"
            value={form.search}
            onChange={(e) => setForm((f) => ({ ...f, search: e.target.value }))}
            placeholder="np. Biedronka, pensja, przelew…"
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.importOnly}
            onChange={(e) => setForm((f) => ({ ...f, importOnly: e.target.checked }))}
          />
          Tylko z importu
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.manualOnly}
            onChange={(e) => setForm((f) => ({ ...f, manualOnly: e.target.checked }))}
          />
          Tylko ręczne
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.includeReconciled}
            onChange={(e) => setForm((f) => ({ ...f, includeReconciled: e.target.checked }))}
          />
          Pokaż pominięte (archiwalne)
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <span className="text-xs text-muted">Szybkie widoki:</span>
        {SAVED_VIEWS.map((v) => (
          <a
            key={v.id}
            href={buildTransactionsUrl(filterState, {
              period: "preset" in v ? v.preset : filterState.period,
              type: "type" in v ? v.type : filterState.type,
              page: 1,
            })}
            className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
          >
            {v.label}
          </a>
        ))}
      </div>

      <TransactionsSavedViews filterState={filterState} />

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={apply}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Zastosuj filtry
        </button>
        <a
          href={clearAllFilters(filterState)}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Wyczyść
        </a>
      </div>
    </div>
  );
}
