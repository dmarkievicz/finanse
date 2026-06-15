"use client";

import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import type { VaultCoinItem } from "@/lib/queries/bullion-vault";
import {
  VAULT_SERIES_COLUMNS,
  VAULT_SERIES_LABELS,
  VAULT_WEIGHT_ROWS,
} from "@/lib/gold/coin-stock-images";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Vault } from "lucide-react";

const SERIES_SHORT: Record<string, string> = {
  kangaroo: "Kangur",
  britannia: "Britannia",
  philharmonic: "Filharmonik",
  maple: "Klon",
  krugerrand: "Krugerrand",
};

interface BullionVaultCassetteProps {
  grid: (VaultCoinItem | null)[][];
  eagle: VaultCoinItem | null;
}

export function BullionVaultCassette({ grid, eagle }: BullionVaultCassetteProps) {
  const filled = grid.flat().filter(Boolean).length + (eagle ? 1 : 0);

  if (filled === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-200/80 bg-gradient-to-b from-amber-50/50 to-card py-20 text-center">
        <Vault className="mx-auto h-12 w-12 text-amber-300" />
        <p className="mt-4 text-base font-medium text-foreground">Sejf jest pusty</p>
        <p className="mt-1 text-[13px] text-muted">Dodaj monety przyciskiem powyżej</p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 p-4 shadow-xl sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-amber-200/90">
            <Vault className="h-4 w-4" />
            Kasetki · 4 × 5
          </h2>
          <span className="text-[12px] text-amber-200/50">{filled} monet</span>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="min-w-[720px]">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `5rem repeat(5, minmax(7.5rem, 1fr))` }}
            >
              <div />
              {VAULT_SERIES_COLUMNS.map((s) => (
                <div
                  key={s}
                  className="rounded-lg bg-amber-950/40 px-2 py-2 text-center"
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide text-amber-100">
                    {SERIES_SHORT[s]}
                  </p>
                  <p className="mt-0.5 truncate text-[9px] text-amber-200/40">
                    {VAULT_SERIES_LABELS[s]}
                  </p>
                </div>
              ))}

              {VAULT_WEIGHT_ROWS.map((weightRow, ri) => (
                <Fragment key={weightRow.row}>
                  <div className="flex flex-col items-end justify-center pr-2 text-right">
                    <span className="text-sm font-bold text-amber-100">{weightRow.label}</span>
                    <span className="text-[10px] text-amber-200/40">waga</span>
                  </div>
                  {grid[ri].map((coin, ci) => (
                    <VaultCell key={`${ri}-${ci}`} coin={coin} />
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {eagle && (
        <div className="rounded-2xl border border-amber-200/50 bg-card p-5 shadow-sm">
          <h2 className="mb-4 text-[15px] font-semibold text-foreground">
            Osobna szuflada — Amerykański Orzeł
          </h2>
          <div className="mx-auto max-w-sm">
            <VaultCell coin={eagle} large />
          </div>
        </div>
      )}
    </section>
  );
}

function VaultCell({ coin, large }: { coin: VaultCoinItem | null; large?: boolean }) {
  if (!coin) {
    return (
      <div
        className={cn(
          "flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-amber-900/50 bg-amber-950/20",
          large && "aspect-[5/4]"
        )}
      >
        <div className="h-8 w-8 rounded-full border border-amber-800/30 bg-amber-950/30" />
        <span className="mt-2 text-[9px] uppercase tracking-wider text-amber-200/25">pusto</span>
      </div>
    );
  }

  const pnl = coin.pnl_pln;
  const img = coin.image_url;

  return (
    <Link
      href={`/investments/${coin.id}`}
      className={cn(
        "group relative overflow-hidden rounded-xl ring-2 ring-amber-600/40 ring-offset-2 ring-offset-stone-900 transition duration-300 hover:ring-amber-400/70 hover:shadow-lg hover:shadow-amber-900/40",
        large ? "aspect-[5/4]" : "aspect-square"
      )}
    >
      {img ? (
        <Image
          src={img}
          alt={coin.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-110"
          sizes={large ? "400px" : "140px"}
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-700 to-amber-900 text-2xl font-bold text-amber-200/60">
          Au
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-90" />
      <div className="absolute inset-x-0 bottom-0 p-2.5">
        <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white">
          {coin.name}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-1">
          <span className="text-[11px] font-bold tabular-nums text-amber-200">
            {formatPln(coin.current_value_pln)}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium tabular-nums",
              pnl >= 0 ? "text-emerald-400" : "text-red-400"
            )}
          >
            {pnl >= 0 ? "+" : ""}
            {formatPln(pnl)}
          </span>
        </div>
      </div>
    </Link>
  );
}
