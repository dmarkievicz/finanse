"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Blocks, Loader2, Plus } from "lucide-react";
import { formatPln } from "@/lib/format";
import type { PaymentAccountOption } from "@/components/investments/bullion/bullion-purchase-wizard";

const inputClass =
  "mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30";

interface CollectiblesPurchaseWizardProps {
  bankAccounts: PaymentAccountOption[];
}

export function CollectiblesPurchaseWizard({ bankAccounts }: CollectiblesPurchaseWizardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [setNumber, setSetNumber] = useState("");
  const [condition, setCondition] = useState("nowy");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentAccountId, setPaymentAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = Number(purchasePrice.replace(",", "."));
  const est = estimatedValue ? Number(estimatedValue.replace(",", ".")) : price;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !paymentAccountId || Number.isNaN(price)) {
      setError("Uzupełnij nazwę, konto i cenę zakupu");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/collectibles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          set_number: setNumber.trim() || undefined,
          condition,
          purchase_price_pln: price,
          estimated_value_pln: Number.isNaN(est) ? price : est,
          purchase_date: purchaseDate,
          payment_account_id: paymentAccountId,
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Błąd zapisu");
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
        className="mb-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-red-500/30 bg-red-950/20 py-4 text-sm font-medium text-red-200 transition hover:border-red-400/50 hover:bg-red-950/40"
      >
        <Plus className="h-4 w-4" />
        Dodaj zestaw LEGO (płatność z banku)
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
    >
      <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-200">
        <Blocks className="h-4 w-4 text-red-400" />
        Nowy zakup kolekcjonerski
      </h2>
      <p className="mt-1 text-[12px] text-stone-500">
        Płatność z konta bankowego → pozycja w inwentarzu (bez transferu na konto „LEGO”)
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-[12px] text-stone-400">Nazwa zestawu</span>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-[12px] text-stone-400">Numer zestawu</span>
          <input className={inputClass} value={setNumber} onChange={(e) => setSetNumber(e.target.value)} placeholder="np. 42115" />
        </label>
        <label className="block">
          <span className="text-[12px] text-stone-400">Stan</span>
          <select className={inputClass} value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="nowy">Nowy / zapieczętowany</option>
            <option value="zbudowany">Zbudowany</option>
            <option value="używany">Używany</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[12px] text-stone-400">Cena zakupu (PLN)</span>
          <input className={inputClass} value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} required />
        </label>
        <label className="block">
          <span className="text-[12px] text-stone-400">Wartość szacunkowa (PLN)</span>
          <input className={inputClass} value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} placeholder={purchasePrice || "opcjonalnie"} />
        </label>
        <label className="block">
          <span className="text-[12px] text-stone-400">Data zakupu</span>
          <input type="date" className={inputClass} value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="text-[12px] text-stone-400">Konto płatności</span>
          <select className={inputClass} value={paymentAccountId} onChange={(e) => setPaymentAccountId(e.target.value)} required>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[12px] text-stone-400">Notatki</span>
          <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
      </div>

      {price > 0 && (
        <p className="mt-3 text-[12px] text-stone-500">
          Z konta zostanie pobrane {formatPln(price)} · inwentarz +{formatPln(est || price)}
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Zapisz zakup
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2 text-sm text-stone-400 hover:text-stone-200">
          Anuluj
        </button>
      </div>
    </form>
  );
}
