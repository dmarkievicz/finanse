"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { TransactionDetail } from "@/lib/queries/transaction-detail";

interface TransactionEditFormProps {
  transaction: TransactionDetail;
  categories: { id: string; name: string }[];
}

export function TransactionEditForm({ transaction, categories }: TransactionEditFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState(transaction.status);
  const [categoryId, setCategoryId] = useState(transaction.category_id ?? "");
  const [date, setDate] = useState(transaction.date);
  const [details, setDetails] = useState(transaction.details ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          category_id: categoryId || null,
          date,
          details: details || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");
      setMessage("Zapisano");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Usunąć transakcję? (soft delete — pozostanie w bazie)")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soft_delete: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Błąd");
      }
      router.push("/transactions");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="confirmed">Potwierdzona</option>
            <option value="needs_review">Do poprawy</option>
            <option value="pending">Oczekująca</option>
            <option value="reconciled">Pominięta weryfikacja (archiwalna)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Kategoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">— brak —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Szczegóły</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Zapisz zmiany
        </button>
        <button
          type="button"
          disabled={loading || transaction.is_opening_balance}
          onClick={handleDelete}
          className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Usuń
        </button>
      </div>

      {transaction.is_opening_balance && (
        <p className="text-xs text-muted">Saldo otwarcia — nie można usunąć z tego ekranu.</p>
      )}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
