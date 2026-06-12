"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

export function ExchangeRatesPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/exchange-rates", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setResult(`Zsynchronizowano ${data.synced} kursów NBP na dzień ${data.date}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium">Kursy walut NBP</h2>
      <p className="mt-2 text-sm text-muted">
        Automatyczne kursy EUR, USD, GBP, CHF i CZK z tabeli A NBP. Używane przy dodawaniu
        transakcji walutowych.
      </p>
      <button
        type="button"
        onClick={() => void sync()}
        disabled={loading}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        Synchronizuj z NBP
      </button>
      {result && <p className="mt-2 text-sm text-emerald-700">{result}</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
