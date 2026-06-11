"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { TransactionListItem } from "@/lib/queries/transactions";
import type { TransactionType } from "@/types/database";
import { matchAccountId } from "@/lib/transactions/match-account";
import { previewEntryPln } from "@/lib/transactions/build-entries";
import { formatPln } from "@/lib/format";

interface AccountOption {
  id: string;
  name: string;
  default_currency: string;
}

interface ReviewEntryPanelProps {
  item: TransactionListItem;
  accounts: AccountOption[];
  compact?: boolean;
  onSuccess?: () => void;
}

function needsEntryForm(item: TransactionListItem): boolean {
  return item.status === "needs_review" && item.amountPln == null;
}

export function needsReviewEntryForm(item: TransactionListItem): boolean {
  return needsEntryForm(item);
}

function defaultAmount(item: TransactionListItem): string {
  if (item.pendingAmount != null) return String(Math.abs(item.pendingAmount));
  if (item.pendingAmountPln != null) return String(item.pendingAmountPln);
  return "";
}

export function ReviewEntryPanel({
  item,
  accounts,
  compact = false,
  onSuccess,
}: ReviewEntryPanelProps) {
  const type = item.type as TransactionType;
  const showSource = ["transfer", "exchange", "expense", "adjustment"].includes(type);
  const showTarget = ["transfer", "exchange", "income", "adjustment"].includes(type);

  const [createEntries, setCreateEntries] = useState(true);
  const [sourceAccountId, setSourceAccountId] = useState(() =>
    matchAccountId(accounts, item.pendingSourceAccount ?? "")
  );
  const [targetAccountId, setTargetAccountId] = useState(() =>
    matchAccountId(accounts, item.pendingTargetAccount ?? "")
  );
  const [amount, setAmount] = useState(() => defaultAmount(item));
  const [currency, setCurrency] = useState(item.pendingCurrency ?? "PLN");
  const [exchangeRate, setExchangeRate] = useState(
    String(item.pendingExchangeRate ?? 1)
  );
  const [confirmAfter, setConfirmAfter] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!needsEntryForm(item)) return null;

  const parsedAmount = Number(amount.replace(",", "."));
  const parsedRate = Number(exchangeRate.replace(",", ".")) || 1;
  const previewPln =
    parsedAmount && !Number.isNaN(parsedAmount)
      ? Math.abs(previewEntryPln(parsedAmount, parsedRate))
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!createEntries) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${item.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_account_id: sourceAccountId || undefined,
          target_account_id: targetAccountId || undefined,
          amount: parsedAmount,
          currency,
          exchange_rate: parsedRate,
          confirm: confirmAfter,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-lg border border-amber-200 bg-amber-50/50 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={createEntries}
            onChange={(e) => setCreateEntries(e.target.checked)}
          />
          Utwórz wpisy księgowe
        </label>
        {item.reviewMessage && (
          <span className="text-xs text-amber-800">{item.reviewMessage}</span>
        )}
      </div>

      {createEntries && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {showSource && (
            <div>
              <label className="text-xs font-medium text-muted">Konto źródłowe</label>
              <select
                value={sourceAccountId}
                onChange={(e) => setSourceAccountId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm"
              >
                <option value="">— wybierz —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {showTarget && (
            <div>
              <label className="text-xs font-medium text-muted">Konto docelowe</label>
              <select
                value={targetAccountId}
                onChange={(e) => setTargetAccountId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm"
              >
                <option value="">— wybierz —</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted">Kwota</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              inputMode="decimal"
              required
              className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted">Waluta / kurs</label>
            <div className="mt-1 flex gap-1">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-20 rounded-lg border border-border bg-white px-1 py-1.5 text-sm"
              >
                <option value="PLN">PLN</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
              <input
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                inputMode="decimal"
                className="min-w-0 flex-1 rounded-lg border border-border bg-white px-2 py-1.5 text-sm"
                title="Kurs do PLN"
              />
            </div>
            {previewPln != null && (
              <p className="mt-0.5 text-xs text-muted">≈ {formatPln(previewPln)} PLN</p>
            )}
          </div>
        </div>
      )}

      {createEntries && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={confirmAfter}
              onChange={(e) => setConfirmAfter(e.target.checked)}
            />
            Potwierdź transakcję po zapisie
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Zapisz wpisy
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
