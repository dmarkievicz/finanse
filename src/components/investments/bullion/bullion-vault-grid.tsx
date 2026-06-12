"use client";

import type { BullionItem } from "@/lib/queries/bullion";
import { BullionCoinCard } from "@/components/investments/bullion/bullion-coin-card";
import { Vault } from "lucide-react";

interface BullionVaultGridProps {
  items: BullionItem[];
}

export function BullionVaultGrid({ items }: BullionVaultGridProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 py-16 text-center">
        <Vault className="mx-auto h-12 w-12 text-amber-700/50" />
        <p className="mt-4 text-lg font-medium text-stone-300">Sejf jest pusty</p>
        <p className="mt-1 text-[13px] text-stone-500">
          Kup monetę w sklepie, zapłać z mBanku — dodaj ją tutaj z ceną i zdjęciem
        </p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-stone-500">
        <Vault className="h-4 w-4 text-amber-600" />
        Kolekcja · {items.length} {items.length === 1 ? "pozycja" : "pozycji"}
      </h2>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <BullionCoinCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
