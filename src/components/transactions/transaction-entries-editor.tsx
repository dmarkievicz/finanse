"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { TransactionDetail, TransactionEntryDetail } from "@/lib/queries/transaction-detail";
import { signedAmountPln } from "@/lib/balances/invariants";

interface TransactionEntriesEditorProps {
  transaction: TransactionDetail;
  accounts: { id: string; name: string; default_currency: string }[];
}

function entryState(entries: TransactionEntryDetail[]) {
  return entries.map((e) => ({
    id: e.id,
    account_id: e.account_id,
    amount: String(e.amount),
    currency: e.currency,
    exchange_rate: String(e.exchange_rate),
  }));
}

export function TransactionEntriesEditor({
  transaction,
  accounts,
}: TransactionEntriesEditorProps) {
  const router = useRouter();
  const editable = ["transfer", "exchange", "expense", "income", "adjustment"].includes(
    transaction.type
  );
  const [rows, setRows] = useState(() => entryState(transaction.entries));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function updateRow(index: number, field: string, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const payload = rows.map((r) => ({
        id: r.id,
        account_id: r.account_id,
        amount: Number(r.amount.replace(",", ".")),
        currency: r.currency,
        exchange_rate: Number(r.exchange_rate.replace(",", ".")),
      }));

      const res = await fetch(`/api/transactions/${transaction.id}/entries`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");
      setMessage("Wpisy zapisane");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  if (!editable || transaction.entries.length === 0) return null;

  return (
    <form onSubmit={handleSave} className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold text-foreground">Edycja wpisów księgowych</h3>
      <p className="mt-1 text-xs text-muted">
        Kwota PLN przeliczana automatycznie: kwota × kurs
      </p>

      <div className="mt-4 space-y-4">
        {rows.map((row, i) => {
          const amount = Number(row.amount.replace(",", ".")) || 0;
          const rate = Number(row.exchange_rate.replace(",", ".")) || 1;
          const previewPln = signedAmountPln(amount, rate);

          return (
            <div
              key={row.id}
              className="grid gap-3 rounded-lg border border-border/60 bg-slate-50/50 p-3 sm:grid-cols-2 lg:grid-cols-5"
            >
              <div className="sm:col-span-2">
                <label className="text-xs font-medium">Konto</label>
                <select
                  value={row.account_id}
                  onChange={(e) => updateRow(i, "account_id", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Kwota</label>
                <input
                  value={row.amount}
                  onChange={(e) => updateRow(i, "amount", e.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium">Waluta</label>
                <select
                  value={row.currency}
                  onChange={(e) => updateRow(i, "currency", e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                >
                  <option value="PLN">PLN</option>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Kurs → PLN</label>
                <input
                  value={row.exchange_rate}
                  onChange={(e) => updateRow(i, "exchange_rate", e.target.value)}
                  inputMode="decimal"
                  className="mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm"
                />
                <p className="mt-0.5 text-xs text-muted">≈ {previewPln.toFixed(2)} PLN</p>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="submit"
        disabled={loading || transaction.is_opening_balance}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Zapisz wpisy
      </button>

      {transaction.is_opening_balance && (
        <p className="mt-2 text-xs text-muted">Saldo otwarcia — edytuj w /accounts/opening</p>
      )}
      {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </form>
  );
}
