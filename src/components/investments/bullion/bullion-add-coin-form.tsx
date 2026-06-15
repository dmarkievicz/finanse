"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { COIN_PRESETS } from "@/lib/gold/coin-presets";
import { VAULT_SERIES_COLUMNS, VAULT_SERIES_LABELS } from "@/lib/gold/coin-stock-images";
import { cn } from "@/lib/utils";

const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

export function BullionAddCoinForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mint, setMint] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [series, setSeries] = useState("");
  const [vaultRow, setVaultRow] = useState("");
  const [vaultCol, setVaultCol] = useState("");
  const [vaultSlot, setVaultSlot] = useState<"grid" | "eagle">("grid");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyPreset(presetId: string) {
    const preset = COIN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setWeightGrams(String(preset.weight_grams));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bullion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mint: mint || undefined,
          weight_grams: Number(weightGrams.replace(",", ".")),
          purchase_price_pln: Number(purchasePrice.replace(",", ".")),
          current_value_pln: currentValue
            ? Number(currentValue.replace(",", "."))
            : undefined,
          purchase_date: purchaseDate,
          series: series || undefined,
          vault_row: vaultSlot === "grid" && vaultRow ? Number(vaultRow) : undefined,
          vault_col: vaultSlot === "grid" && vaultCol ? Number(vaultCol) : undefined,
          vault_slot: vaultSlot,
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
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground shadow-sm transition hover:bg-slate-50"
      >
        <Plus className="h-4 w-4" />
        Dodaj monetę
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border/80 bg-card p-5 shadow-sm"
    >
      <h2 className="text-[15px] font-semibold text-foreground">Nowa moneta (bez transakcji bankowej)</h2>
      <p className="mt-1 text-[13px] text-muted">
        Transfer na ZŁOTO dodajesz w Excelu. Tutaj tylko wpis do Vault.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-[13px] sm:col-span-2">
          Nazwa
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-[13px]">
          Waga (g)
          <input className={inputClass} value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} required />
        </label>
        <label className="block text-[13px]">
          Preset
          <select
            className={inputClass}
            defaultValue=""
            onChange={(e) => e.target.value && applyPreset(e.target.value)}
          >
            <option value="">— wybierz —</option>
            {COIN_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-[13px]">
          Cena zakupu (PLN)
          <input className={inputClass} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required />
        </label>
        <label className="block text-[13px]">
          Wartość bieżąca (PLN)
          <input className={inputClass} value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="jak cena skupu" />
        </label>
        <label className="block text-[13px]">
          Data zakupu
          <input type="date" className={inputClass} value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </label>
        <label className="block text-[13px]">
          Mennica / sklep
          <input className={inputClass} value={mint} onChange={(e) => setMint(e.target.value)} />
        </label>
        <label className="block text-[13px]">
          Kasetka
          <select
            className={inputClass}
            value={vaultSlot}
            onChange={(e) => setVaultSlot(e.target.value as "grid" | "eagle")}
          >
            <option value="grid">Siatka 4×5</option>
            <option value="eagle">Amerykański Orzeł (osobna)</option>
          </select>
        </label>
        {vaultSlot === "grid" && (
          <>
            <label className="block text-[13px]">
              Wiersz (waga)
              <select className={inputClass} value={vaultRow} onChange={(e) => setVaultRow(e.target.value)}>
                <option value="">—</option>
                <option value="1">1 — 1 oz</option>
                <option value="2">2 — 1/2 oz</option>
                <option value="3">3 — 1/4 oz</option>
                <option value="4">4 — 1/10 oz</option>
              </select>
            </label>
            <label className="block text-[13px]">
              Kolumna (seria)
              <select className={inputClass} value={vaultCol} onChange={(e) => setVaultCol(e.target.value)}>
                <option value="">—</option>
                {VAULT_SERIES_COLUMNS.map((s, i) => (
                  <option key={s} value={String(i + 1)}>
                    {i + 1} — {VAULT_SERIES_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] sm:col-span-2">
              Seria
              <select className={inputClass} value={series} onChange={(e) => setSeries(e.target.value)}>
                <option value="">—</option>
                {VAULT_SERIES_COLUMNS.map((s) => (
                  <option key={s} value={s}>
                    {VAULT_SERIES_LABELS[s]}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>

      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            loading && "opacity-60"
          )}
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Zapisz monetę
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-border px-4 py-2 text-sm text-muted"
        >
          Anuluj
        </button>
      </div>
    </form>
  );
}
