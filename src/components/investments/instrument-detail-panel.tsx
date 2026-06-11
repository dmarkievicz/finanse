"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import type { InstrumentDetail } from "@/lib/queries/instruments";
import { INSTRUMENT_TYPE_LABELS } from "@/lib/queries/instruments";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InstrumentDetailPanelProps {
  instrument: InstrumentDetail;
}

const TX_TYPES = [
  { value: "buy", label: "Zakup" },
  { value: "sell", label: "Sprzedaż" },
  { value: "dividend", label: "Dywidenda" },
  { value: "coupon", label: "Kupon" },
  { value: "interest", label: "Odsetki" },
  { value: "fee", label: "Opłata" },
  { value: "tax", label: "Podatek" },
];

export function InstrumentDetailPanel({ instrument }: InstrumentDetailPanelProps) {
  const router = useRouter();
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txType, setTxType] = useState("buy");
  const [txAmount, setTxAmount] = useState("");
  const [txQty, setTxQty] = useState("");
  const [txPrice, setTxPrice] = useState("");
  const [txNotes, setTxNotes] = useState("");
  const [priceDate, setPriceDate] = useState(new Date().toISOString().slice(0, 10));
  const [priceValue, setPriceValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addTransaction(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/instruments/${instrument.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: txDate,
          type: txType,
          amount: Number(txAmount.replace(",", ".")),
          currency: instrument.currency,
          quantity: txQty ? Number(txQty.replace(",", ".")) : null,
          price_per_unit: txPrice ? Number(txPrice.replace(",", ".")) : null,
          notes: txNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setTxAmount("");
      setTxQty("");
      setTxPrice("");
      setTxNotes("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  async function addPrice(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/instruments/${instrument.id}/prices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: priceDate,
          price: Number(priceValue.replace(",", ".")),
          currency: instrument.currency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setPriceValue("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  async function removeInstrument() {
    if (!confirm(`Usunąć instrument „${instrument.name}"?`)) return;
    await fetch(`/api/instruments/${instrument.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ soft_delete: true }),
    });
    router.push("/investments");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted">Wartość rynkowa</p>
          <p className="mt-1 text-2xl font-bold">{formatPln(instrument.market_value_pln)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted">Zainwestowano</p>
          <p className="mt-1 text-2xl font-bold">{formatPln(instrument.invested_pln)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted">Zysk / strata</p>
          <p
            className={cn(
              "mt-1 text-2xl font-bold",
              instrument.pnl_pln > 0 ? "text-emerald-600" : instrument.pnl_pln < 0 ? "text-red-600" : ""
            )}
          >
            {formatPln(instrument.pnl_pln)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted">Ostatnia cena</p>
          <p className="mt-1 text-2xl font-bold">
            {instrument.last_price != null
              ? `${instrument.last_price.toLocaleString("pl-PL")} ${instrument.currency}`
              : "—"}
          </p>
          {instrument.last_price_date && (
            <p className="text-xs text-muted">na {instrument.last_price_date}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
        <span>{INSTRUMENT_TYPE_LABELS[instrument.instrument_type]}</span>
        {instrument.symbol && <span>· {instrument.symbol}</span>}
        {instrument.account_name && <span>· Konto: {instrument.account_name}</span>}
        <button
          type="button"
          onClick={removeInstrument}
          className="ml-auto inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Usuń instrument
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={addTransaction} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">Nowa operacja</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Data</label>
              <input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Typ</label>
              <select
                value={txType}
                onChange={(e) => setTxType(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                {TX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium">Kwota ({instrument.currency})</label>
              <input
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                required
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Ilość (opcj.)</label>
              <input
                value={txQty}
                onChange={(e) => setTxQty(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Cena jedn. (opcj.)</label>
              <input
                value={txPrice}
                onChange={(e) => setTxPrice(e.target.value)}
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Notatka</label>
              <input
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Zapisz operację
          </button>
        </form>

        <form onSubmit={addPrice} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h3 className="font-semibold">Wycena ręczna</h3>
          <p className="text-xs text-muted">
            Ustaw cenę jednostkową — wartość = ilość × cena. Bez ceny używane są sumy operacji.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium">Data</label>
              <input
                type="date"
                value={priceDate}
                onChange={(e) => setPriceDate(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium">Cena ({instrument.currency})</label>
              <input
                value={priceValue}
                onChange={(e) => setPriceValue(e.target.value)}
                required
                inputMode="decimal"
                className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Zapisz cenę
          </button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold">Historia operacji</div>
          {instrument.transactions.length === 0 ? (
            <p className="p-4 text-sm text-muted">Brak operacji</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Typ</th>
                    <th className="px-4 py-2 text-right">PLN</th>
                  </tr>
                </thead>
                <tbody>
                  {instrument.transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/60">
                      <td className="px-4 py-2">{tx.date}</td>
                      <td className="px-4 py-2 capitalize">{tx.type}</td>
                      <td className="px-4 py-2 text-right font-medium">{formatPln(tx.amount_pln)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold">Historia cen</div>
          {instrument.prices.length === 0 ? (
            <p className="p-4 text-sm text-muted">Brak wycen</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted">
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2 text-right">Cena</th>
                    <th className="px-4 py-2">Źródło</th>
                  </tr>
                </thead>
                <tbody>
                  {instrument.prices.map((p) => (
                    <tr key={p.id} className="border-b border-border/60">
                      <td className="px-4 py-2">{p.date}</td>
                      <td className="px-4 py-2 text-right font-medium">
                        {p.price.toLocaleString("pl-PL")} {p.currency}
                      </td>
                      <td className="px-4 py-2 text-muted">{p.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
