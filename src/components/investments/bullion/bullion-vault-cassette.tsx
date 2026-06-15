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

interface BullionVaultCassetteProps {
  grid: (VaultCoinItem | null)[][];
  eagle: VaultCoinItem | null;
}

export function BullionVaultCassette({ grid, eagle }: BullionVaultCassetteProps) {
  const hasAny = grid.some((row) => row.some(Boolean)) || eagle;

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-slate-50/50 py-16 text-center">
        <Vault className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-foreground">Kasetki są puste</p>
        <p className="mt-1 text-[13px] text-muted">Dodaj monety lub uruchom seed z Excela</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="mb-3 text-[15px] font-semibold text-foreground">Kasetki 4 × 5</h2>
        <div className="overflow-x-auto rounded-xl border border-border/80 bg-card p-3 shadow-sm sm:p-4">
          <div className="min-w-[640px]">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `4rem repeat(5, minmax(0, 1fr))` }}
            >
              <div />
              {VAULT_SERIES_COLUMNS.map((s) => (
                <div
                  key={s}
                  className="truncate px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted"
                >
                  {VAULT_SERIES_LABELS[s].split(" ")[0]}
                </div>
              ))}

              {VAULT_WEIGHT_ROWS.map((weightRow, ri) => (
                <Fragment key={weightRow.row}>
                  <div className="flex items-center justify-end pr-2 text-[11px] font-medium text-muted">
                    {weightRow.label}
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
        <div>
          <h2 className="mb-3 text-[15px] font-semibold text-foreground">
            Osobna kasetka — Amerykański Orzeł
          </h2>
          <div className="max-w-xs">
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
          "flex aspect-square items-center justify-center rounded-lg border border-dashed border-border/60 bg-slate-50/80",
          large && "aspect-[4/3]"
        )}
      >
        <span className="text-[10px] text-slate-300">—</span>
      </div>
    );
  }

  const pnl = coin.pnl_pln;
  const img = coin.image_url;

  return (
    <Link
      href={`/investments/${coin.id}`}
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border/80 bg-slate-50 shadow-sm transition hover:border-primary/30 hover:shadow-md",
        large ? "aspect-[4/3]" : "aspect-square"
      )}
    >
      {img ? (
        <Image
          src={img}
          alt={coin.name}
          fill
          className="object-cover transition group-hover:scale-105"
          sizes={large ? "320px" : "120px"}
          unoptimized
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-amber-50 text-amber-700/40 text-xs">
          Au
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6">
        <p className="truncate text-[10px] font-medium text-white">{coin.name}</p>
        <p className="text-[9px] tabular-nums text-white/80">
          {formatPln(coin.current_value_pln)}
          <span
            className={cn(
              "ml-1",
              pnl >= 0 ? "text-emerald-300" : "text-red-300"
            )}
          >
            {pnl >= 0 ? "+" : ""}
            {formatPln(pnl)}
          </span>
        </p>
      </div>
    </Link>
  );
}
