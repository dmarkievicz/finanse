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
      className="group overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition hover:border-amber-300/80 hover:shadow-md"
    >
      <div className="relative aspect-[5/4] overflow-hidden border-b border-border/60 bg-slate-50">
        <BullionCoinPhoto
          instrumentId={item.id}
          alt={item.name}
          className="h-full w-full transition duration-300 group-hover:scale-[1.02]"
        />
        <ArrowUpRight className="absolute right-3 top-3 h-5 w-5 text-foreground/0 transition group-hover:text-amber-600" />
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="text-base font-bold leading-tight text-foreground">{item.name}</p>
          <p className="mt-0.5 text-[11px] text-muted">
            {item.bullion.bullion_kind === "bar" ? "Sztabka" : "Moneta"}
            {item.bullion.mint ? ` · ${item.bullion.mint}` : ""}
            {item.bullion.year ? ` · ${item.bullion.year}` : ""}
          </p>
        </div>

        {item.payment_account_name && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted">
            <Banknote className="h-3 w-3" />
            <span className="truncate">Zapłacono z: {item.payment_account_name}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-[12px]">
          <div>
            <p className="text-muted">Zakup</p>
            <p className="font-semibold tabular-nums text-foreground">
              {formatPln(item.purchase_price_pln)}
            </p>
          </div>
          <div>
            <p className="text-muted">Wartość spot</p>
            <p className="font-semibold tabular-nums text-foreground">
              {item.spot_value_pln != null ? formatPln(item.spot_value_pln) : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted">{item.fine_grams.toFixed(1)} g Au</p>
            {item.premium_pct != null && (
              <p className="text-[11px] text-muted">
                Premia {item.premium_pct > 0 ? "+" : ""}
                {item.premium_pct}%
              </p>
            )}
          </div>
          <div>
            <p className="text-muted">Zysk / strata</p>
            <p
              className={cn(
                "font-semibold tabular-nums",
                pnlPositive && "text-emerald-600",
                pnlNegative && "text-red-600",
                !pnlPositive && !pnlNegative && "text-foreground"
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
