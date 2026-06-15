"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export function CollectiblesAddForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [setNumber, setSetNumber] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collectibles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          set_number: setNumber || undefined,
          purchase_price_pln: Number(purchasePrice.replace(",", ".")),
          current_value_pln: currentValue
            ? Number(currentValue.replace(",", "."))
            : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-sm hover:bg-slate-50"
      >
        <Plus className="h-4 w-4" />
        Dodaj zestaw LEGO
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-border/80 bg-card p-5 shadow-sm">
      <h2 className="text-[15px] font-semibold">Nowy zestaw (bez transakcji bankowej)</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] sm:col-span-2">
          Nazwa
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-[13px]">
          Numer zestawu
          <input className={inputClass} value={setNumber} onChange={(e) => setSetNumber(e.target.value)} />
        </label>
        <label className="block text-[13px]">
          Cena zakupu (PLN)
          <input className={inputClass} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required />
        </label>
        <label className="block text-[13px] sm:col-span-2">
          Wartość bieżąca (PLN)
          <input className={inputClass} value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
        </label>
      </div>
      {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={loading} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zapisz"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-border px-4 py-2 text-sm text-muted">
          Anuluj
        </button>
      </div>
    </form>
  );
}
