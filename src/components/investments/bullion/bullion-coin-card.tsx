"use client";

import Link from "next/link";
import type { BullionItem } from "@/lib/queries/bullion";
import { BullionCoinPhoto } from "@/components/investments/bullion/bullion-coin-photo";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Banknote } from "lucide-react";

interface BullionCoinCardProps {
  item: BullionItem;
}

export function BullionCoinCard({ item }: BullionCoinCardProps) {
  const pnlPositive = item.spot_pnl_pln != null && item.spot_pnl_pln > 0;
  const pnlNegative = item.spot_pnl_pln != null && item.spot_pnl_pln < 0;

  return (
    <Link
      href={`/investments/${item.id}`}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-stone-800/80 to-stone-950 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-amber-950/30"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="relative aspect-[5/4] overflow-hidden">
        <BullionCoinPhoto
          instrumentId={item.id}
          alt={item.name}
          className="h-full w-full transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-lg font-bold leading-tight text-white drop-shadow-lg">{item.name}</p>
          <p className="mt-0.5 text-[11px] text-stone-300">
            {item.bullion.bullion_kind === "bar" ? "Sztabka" : "Moneta"}
            {item.bullion.mint ? ` · ${item.bullion.mint}` : ""}
            {item.bullion.year ? ` · ${item.bullion.year}` : ""}
          </p>
        </div>
        <ArrowUpRight className="absolute right-3 top-3 h-5 w-5 text-white/0 transition group-hover:text-amber-300" />
      </div>

      <div className="space-y-3 p-4">
        {item.payment_account_name && (
          <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
            <Banknote className="h-3 w-3" />
            <span className="truncate">Zapłacono z: {item.payment_account_name}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <p className="text-stone-500">Zakup</p>
            <p className="font-semibold tabular-nums text-stone-100">
              {formatPln(item.purchase_price_pln)}
            </p>
          </div>
          <div>
            <p className="text-stone-500">Wartość spot</p>
            <p className="font-semibold tabular-nums text-amber-200">
              {item.spot_value_pln != null ? formatPln(item.spot_value_pln) : "—"}
            </p>
          </div>
          <div>
            <p className="text-stone-500">{item.fine_grams.toFixed(1)} g Au</p>
            {item.premium_pct != null && (
              <p className="text-[11px] text-stone-400">Premia {item.premium_pct > 0 ? "+" : ""}{item.premium_pct}%</p>
            )}
          </div>
          <div>
            <p className="text-stone-500">Zysk / strata</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                pnlPositive && "text-emerald-400",
                pnlNegative && "text-rose-400",
                !pnlPositive && !pnlNegative && "text-stone-300"
              )}
            >
              {item.spot_pnl_pln != null ? formatPln(item.spot_pnl_pln) : "—"}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
