"use client";

import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import type { VaultCoinItem } from "@/lib/queries/bullion-vault";
import {
  VAULT_SERIES_COLUMNS,
  VAULT_SERIES_LABELS,
  VAULT_WEIGHT_ROWS,
} from "@/lib/gold/coin-stock-images";
import { BullionCoinPhoto } from "@/components/investments/bullion/bullion-coin-photo";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Vault } from "lucide-react";

const SERIES_SHORT: Record<string, string> = {
  kangaroo: "Kangur",
  britannia: "Britannia",
  philharmonic: "Filharmonik",
  maple: "Klon",
  krugerrand: "Krugerrand",
  eagle: "Orzeł",
};

interface BullionVaultCassetteProps {
  grid: (VaultCoinItem | null)[][];
  eagle: VaultCoinItem | null;
}

export function BullionVaultCassette({ grid, eagle }: BullionVaultCassetteProps) {
  const gridFilled = grid.flat().filter(Boolean).length;
  const totalFilled = gridFilled + (eagle ? 1 : 0);

  if (totalFilled === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-20 text-center">
        <Vault className="mx-auto h-12 w-12 text-amber-400" />
        <p className="mt-4 text-base font-medium text-foreground">Sejf jest pusty</p>
        <p className="mt-1 text-[13px] text-muted">Dodaj monety przyciskiem powyżej</p>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {gridFilled > 0 && (
        <CassettePanel title="Kasetka · 4 × 5" coinCount={gridFilled}>
          <CassetteGrid columns={VAULT_SERIES_COLUMNS.length}>
            <div />
            {VAULT_SERIES_COLUMNS.map((s) => (
              <SeriesHeader key={s} short={SERIES_SHORT[s]} label={VAULT_SERIES_LABELS[s]} />
            ))}

            {VAULT_WEIGHT_ROWS.map((weightRow, ri) => (
              <Fragment key={weightRow.row}>
                <WeightLabel label={weightRow.label} />
                {grid[ri].map((coin, ci) => (
                  <VaultCell key={`${ri}-${ci}`} coin={coin} />
                ))}
              </Fragment>
            ))}
          </CassetteGrid>
        </CassettePanel>
      )}

      {eagle && (
        <CassettePanel title="Kasetka · Orzeł" coinCount={1}>
          <CassetteGrid columns={1}>
            <div />
            <SeriesHeader short={SERIES_SHORT.eagle} label={VAULT_SERIES_LABELS.eagle} />
            <WeightLabel label="1 oz" />
            <VaultCell coin={eagle} />
          </CassetteGrid>
        </CassettePanel>
      )}
    </section>
  );
}

function CassettePanel({
  title,
  coinCount,
  children,
}: {
  title: string;
  coinCount: number;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm">
      <div
        className="flex items-center justify-between border-b border-border/60 px-4 py-3.5 sm:px-5"
        style={{
          background: "linear-gradient(90deg, #d9770614, transparent)",
          borderColor: "#d9770625",
        }}
      >
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <Vault className="h-4 w-4 text-amber-600" />
          {title}
        </h2>
        <span className="text-[12px] text-muted">{coinCount} monet</span>
      </div>

      <div className="overflow-x-auto p-4 sm:p-5">{children}</div>
    </div>
  );
}

function CassetteGrid({
  columns,
  children,
}: {
  columns: number;
  children: ReactNode;
}) {
  return (
    <div
      className="grid gap-3"
      style={{
        gridTemplateColumns: `5rem repeat(${columns}, minmax(7.5rem, 1fr))`,
        minWidth: columns === 1 ? undefined : "720px",
      }}
    >
      {children}
    </div>
  );
}

function SeriesHeader({ short, label }: { short: string; label: string }) {
  return (
    <div className="rounded-lg border border-amber-200/60 bg-amber-50/80 px-2 py-2 text-center">
      <p className="text-[11px] font-bold uppercase tracking-wide text-foreground">{short}</p>
      <p className="mt-0.5 truncate text-[9px] text-muted">{label}</p>
    </div>
  );
}

function WeightLabel({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-end justify-center pr-2 text-right">
      <span className="text-sm font-bold text-foreground">{label}</span>
      <span className="text-[10px] text-muted">waga</span>
    </div>
  );
}

function VaultCell({ coin }: { coin: VaultCoinItem | null }) {
  if (!coin) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-slate-50/80">
        <div className="h-8 w-8 rounded-full border border-border bg-card" />
        <span className="mt-2 text-[9px] uppercase tracking-wider text-muted">pusto</span>
      </div>
    );
  }

  const pnl = coin.pnl_pln;

  return (
    <Link
      href={`/investments/${coin.id}`}
      className="group flex aspect-square flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition hover:border-amber-300/80 hover:shadow-md"
    >
      <div className="relative h-[55%] w-full shrink-0 overflow-hidden bg-slate-50">
        <BullionCoinPhoto
          instrumentId={coin.id}
          alt={coin.name}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-between p-2">
        <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-foreground">
          {coin.name}
        </p>
        <div className="mt-1 flex items-baseline justify-between gap-1">
          <span className="text-[11px] font-bold tabular-nums text-foreground">
            {formatPln(coin.current_value_pln)}
          </span>
          <span
            className={cn(
              "text-[10px] font-medium tabular-nums",
              pnl >= 0 ? "text-emerald-600" : "text-red-600"
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
