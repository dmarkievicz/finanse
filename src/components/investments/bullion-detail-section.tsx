"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Banknote, Camera, Loader2, Vault } from "lucide-react";
import type { InstrumentDetail } from "@/lib/queries/instruments";
import { parseGoldBullionMetadata, premiumOverSpotPercent } from "@/lib/gold/bullion-metadata";
import { BullionCoinPhoto } from "@/components/investments/bullion/bullion-coin-photo";
import { formatPln } from "@/lib/format";

interface BullionDetailSectionProps {
  instrument: InstrumentDetail;
  spotPricePerGram?: number | null;
}

export function BullionDetailSection({ instrument, spotPricePerGram }: BullionDetailSectionProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bullion = parseGoldBullionMetadata(instrument.metadata);
  if (!bullion && instrument.instrument_type !== "GOLD") return null;

  const meta = bullion ?? {
    weight_grams: instrument.quantity,
    purchase_price_pln: instrument.invested_pln,
  };

  const purchase = meta.purchase_price_pln ?? instrument.invested_pln;
  const fine = meta.weight_grams * (meta.purity ?? 1);
  const premium =
    spotPricePerGram && spotPricePerGram > 0
      ? premiumOverSpotPercent(purchase, fine, spotPricePerGram)
      : null;

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/instruments/${instrument.id}/photo`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd uploadu");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-stone-900 via-amber-950/20 to-stone-950">
      <div className="border-b border-white/5 px-5 py-3">
        <h3 className="flex items-center gap-2 font-semibold text-amber-100">
          <Vault className="h-4 w-4 text-amber-400" />
          Bulion Vault
        </h3>
      </div>

      {meta.payment_account_name && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-black/20 px-5 py-3 text-[13px]">
          <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-stone-300">
            <Banknote className="h-4 w-4 text-stone-400" />
            {meta.payment_account_name}
          </div>
          <ArrowRight className="h-4 w-4 text-amber-600" />
          <div className="rounded-lg bg-amber-500/15 px-3 py-1.5 font-medium text-amber-200 ring-1 ring-amber-500/30">
            {instrument.name}
          </div>
          <span className="text-stone-500">— wydatek z banku, nie transfer na „ZŁOTO”</span>
        </div>
      )}

      <div className="flex flex-col gap-4 p-5 sm:flex-row">
        <div className="relative h-48 w-full shrink-0 overflow-hidden rounded-xl sm:w-52">
          <BullionCoinPhoto instrumentId={instrument.id} alt={instrument.name} className="h-full w-full" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-3">
              <div>
                <dt className="text-stone-500">Rodzaj</dt>
                <dd className="font-medium text-stone-200">
                  {meta.bullion_kind === "bar" ? "Sztabka" : "Moneta"}
                </dd>
              </div>
              <div>
                <dt className="text-stone-500">Waga</dt>
                <dd className="font-medium tabular-nums text-stone-200">{meta.weight_grams} g</dd>
              </div>
              {meta.purity != null && (
                <div>
                  <dt className="text-stone-500">Próba</dt>
                  <dd className="font-medium tabular-nums text-stone-200">{meta.purity}</dd>
                </div>
              )}
              {meta.mint && (
                <div>
                  <dt className="text-stone-500">Mennica</dt>
                  <dd className="font-medium text-stone-200">{meta.mint}</dd>
                </div>
              )}
              <div>
                <dt className="text-stone-500">Zapłacono</dt>
                <dd className="font-semibold tabular-nums text-amber-200">{formatPln(purchase)}</dd>
              </div>
              {premium != null && (
                <div>
                  <dt className="text-stone-500">Premia nad spot</dt>
                  <dd className="font-semibold tabular-nums text-amber-300">
                    {premium > 0 ? "+" : ""}
                    {premium}%
                  </dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[12px] font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
              {instrument.metadata?.photo_storage_path ? "Zmień zdjęcie" : "Dodaj zdjęcie"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadPhoto(file);
              }}
            />
          </div>
          {meta.payment_account_name && (
            <Link
              href={`/transactions?search=${encodeURIComponent("Zakup złota")}`}
              className="inline-flex items-center gap-1 text-[12px] text-amber-400/80 hover:text-amber-300"
            >
              Zobacz wydatek na koncie
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {error && <p className="text-[12px] text-rose-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
