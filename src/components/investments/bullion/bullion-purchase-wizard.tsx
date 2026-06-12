"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Camera,
  Coins,
  Loader2,
  Sparkles,
  Vault,
} from "lucide-react";
import { COIN_PRESETS } from "@/lib/gold/coin-presets";
import { fineGoldGrams, premiumOverSpotPercent, type BullionKind } from "@/lib/gold/bullion-metadata";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface PaymentAccountOption {
  id: string;
  name: string;
  account_type: string;
}

interface BullionPurchaseWizardProps {
  bankAccounts: PaymentAccountOption[];
  spotPricePerGram?: number | null;
}

const inputClass =
  "mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-stone-100 placeholder:text-stone-600 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30";

export function BullionPurchaseWizard({ bankAccounts, spotPricePerGram }: BullionPurchaseWizardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [mint, setMint] = useState("");
  const [year, setYear] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [purity, setPurity] = useState("0.9999");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentAccountId, setPaymentAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [bullionKind, setBullionKind] = useState<BullionKind>("coin");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAccount = bankAccounts.find((a) => a.id === paymentAccountId);

  const liveCalc = useMemo(() => {
    const w = Number(weightGrams.replace(",", "."));
    const p = Number(purchasePrice.replace(",", "."));
    const pur = Number(purity.replace(",", "."));
    if (!w || !p) return null;
    const meta = { weight_grams: w, purity: pur };
    const fine = fineGoldGrams(meta);
    const premium =
      spotPricePerGram && spotPricePerGram > 0
        ? premiumOverSpotPercent(p, fine, spotPricePerGram)
        : null;
    const spotVal = spotPricePerGram ? fine * spotPricePerGram : null;
    return { fine, premium, spotVal, pricePerGram: p / w };
  }, [weightGrams, purchasePrice, purity, spotPricePerGram]);

  function applyPreset(presetId: string) {
    const preset = COIN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setWeightGrams(String(preset.weight_grams));
    setPurity(String(preset.purity));
    if (preset.mint_hint && !mint) setMint(preset.mint_hint);
    if (preset.id.startsWith("bar")) setBullionKind("bar");
    else setBullionKind("coin");
  }

  function onPhotoChange(file: File | null) {
    setPhoto(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bullion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          payment_account_id: paymentAccountId,
          mint: mint || undefined,
          year: year ? Number(year) : undefined,
          weight_grams: Number(weightGrams.replace(",", ".")),
          purity: Number(purity.replace(",", ".")),
          purchase_price_pln: Number(purchasePrice.replace(",", ".")),
          purchase_date: purchaseDate,
          bullion_kind: bullionKind,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");

      if (photo) {
        const form = new FormData();
        form.append("file", photo);
        const photoRes = await fetch(`/api/instruments/${data.id}/photo`, {
          method: "POST",
          body: form,
        });
        if (!photoRes.ok) {
          const photoData = await photoRes.json();
          throw new Error(photoData.error ?? "Moneta zapisana — zdjęcie nie wgrane");
        }
      }

      router.push(`/investments/${data.id}`);
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
        className="group mb-10 flex w-full items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-transparent p-5 text-left transition hover:border-amber-400/50 hover:from-amber-600/30"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-amber-50">Kupiłem monetę — dodaj do sejfu</p>
            <p className="text-[13px] text-stone-400">
              Płatność z konta bankowego → bulion w inwentarzu (nie tworzymy konta „ZŁOTO”)
            </p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-amber-400 transition group-hover:translate-x-1" />
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mb-10 overflow-hidden rounded-2xl border border-amber-500/25 bg-stone-900/80 shadow-2xl backdrop-blur-xl"
    >
      <div className="border-b border-white/5 bg-gradient-to-r from-amber-950/50 to-transparent px-5 py-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-50">
          <Coins className="h-5 w-5 text-amber-400" />
          Nowy zakup bulionu
        </h2>
        <p className="mt-1 text-[13px] text-stone-400">
          Zapisz monetę, cenę i konto — automatycznie obciążymy bank i powiążemy z inwestycją
        </p>
      </div>

      {/* Flow visualization */}
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-white/5 bg-black/20 px-5 py-4 text-[12px]">
        <FlowNode icon={Banknote} label={selectedAccount?.name ?? "Konto bankowe"} sub="− PLN" />
        <ArrowRight className="h-4 w-4 shrink-0 text-amber-600" />
        <FlowNode icon={Vault} label="Sejf bulionowy" sub="+ moneta" highlight />
        <span className="hidden text-stone-600 sm:inline">·</span>
        <span className="text-stone-500">Bez konta „ZŁOTO”</span>
      </div>

      <div className="grid gap-6 p-5 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
              Konto płatności
            </label>
            {bankAccounts.length === 0 ? (
              <p className="mt-2 text-sm text-amber-400">
                Brak kont bankowych — dodaj konto w module Konta (np. mBank).
              </p>
            ) : (
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                required
                className={inputClass}
              >
                {bankAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {COIN_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-stone-300 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-200"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Nazwa monety
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Krugerrand 1 oz 2024"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Rodzaj
              </label>
              <select
                value={bullionKind}
                onChange={(e) => setBullionKind(e.target.value as BullionKind)}
                className={inputClass}
              >
                <option value="coin">Moneta</option>
                <option value="bar">Sztabka</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Mennica
              </label>
              <input
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                placeholder="Krugerrand, NBP, PAMP"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Waga (g)
              </label>
              <input
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                required
                inputMode="decimal"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Próba
              </label>
              <input
                value={purity}
                onChange={(e) => setPurity(e.target.value)}
                inputMode="decimal"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Zapłaciłem (PLN)
              </label>
              <input
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
                inputMode="decimal"
                placeholder="8500"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Rok emisji
              </label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                inputMode="numeric"
                placeholder="2024"
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Data zakupu
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-medium uppercase tracking-wide text-stone-500">
                Notatka
              </label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Sklep, numer seryjny, spread…"
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-amber-500/30 bg-black/40 transition hover:border-amber-400/50 hover:bg-amber-950/20">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Podgląd" className="h-full w-full object-cover" />
            ) : (
              <>
                <Camera className="h-10 w-10 text-amber-600/60" />
                <span className="mt-2 text-[13px] text-stone-400">Zdjęcie monety</span>
                <span className="text-[11px] text-stone-600">JPG, PNG · max 5 MB</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
            />
          </label>

          {liveCalc && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-950/30 p-4 text-[13px]">
              <p className="font-medium text-amber-200">Kalkulacja na żywo</p>
              <dl className="mt-2 space-y-1.5 text-stone-300">
                <div className="flex justify-between">
                  <dt className="text-stone-500">Czyste złoto</dt>
                  <dd className="tabular-nums font-medium">{liveCalc.fine.toFixed(2)} g</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-500">Cena / g (zakup)</dt>
                  <dd className="tabular-nums">{formatPln(liveCalc.pricePerGram)}</dd>
                </div>
                {liveCalc.spotVal != null && (
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Wartość wg spot</dt>
                    <dd className="tabular-nums font-medium text-amber-100">
                      {formatPln(liveCalc.spotVal)}
                    </dd>
                  </div>
                )}
                {liveCalc.premium != null && (
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <dt className="text-stone-500">Premia nad spot</dt>
                    <dd
                      className={cn(
                        "font-semibold tabular-nums",
                        liveCalc.premium > 15 ? "text-amber-400" : "text-stone-200"
                      )}
                    >
                      {liveCalc.premium > 0 ? "+" : ""}
                      {liveCalc.premium}%
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </div>
      </div>

      {error && <p className="px-5 pb-2 text-sm text-rose-400">{error}</p>}

      <div className="flex flex-wrap gap-3 border-t border-white/5 bg-black/20 px-5 py-4">
        <button
          type="submit"
          disabled={loading || bankAccounts.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-stone-950 shadow-lg disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Zapisz zakup i obciąż konto
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-2.5 text-sm text-stone-400 hover:text-stone-200"
        >
          Anuluj
        </button>
      </div>
    </form>
  );
}

function FlowNode({
  icon: Icon,
  label,
  sub,
  highlight,
}: {
  icon: typeof Banknote;
  label: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2",
        highlight ? "bg-amber-500/15 ring-1 ring-amber-500/30" : "bg-white/5"
      )}
    >
      <Icon className={cn("h-4 w-4", highlight ? "text-amber-400" : "text-stone-400")} />
      <div>
        <p className="max-w-[140px] truncate font-medium text-stone-200">{label}</p>
        <p className={cn("text-[10px]", highlight ? "text-amber-400/80" : "text-stone-500")}>
          {sub}
        </p>
      </div>
    </div>
  );
}
