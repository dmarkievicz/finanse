"use client";

import Link from "next/link";
import { ArrowLeft, AlertTriangle, Gem } from "lucide-react";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvestmentPortfolioRow } from "@/lib/queries/investment-portfolios";
import { PortfolioValueEditor } from "@/components/investments/portfolio-value-editor";

interface BullionHeroProps {
  portfolio: InvestmentPortfolioRow | null;
  coinCount: number;
  totalFineGrams: number;
  vaultCurrentTotal: number;
}

export function BullionHero({
  portfolio,
  coinCount,
  totalFineGrams,
  vaultCurrentTotal,
}: BullionHeroProps) {
  const invested = portfolio?.transfer_net_pln ?? 0;
  const marketValue = portfolio?.market_value_pln ?? vaultCurrentTotal;
  const pnl = marketValue - invested;

  return (
    <header className="space-y-4">
      <Link
        href="/investments"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Inwestycje
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-slate-600">
            <Gem className="h-3 w-3 text-amber-600" />
            Bulion Vault
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Twój sejf złota
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-muted">
            Kapitał włożony liczy się z transferów Excela (np. mBank → ZŁOTO). Wartość monet
            w kasetkach jest liczona na żywo ze spotu XAU/PLN i marży skupu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Monety" value={String(coinCount)} />
          <Stat label="Czyste Au" value={`${totalFineGrams.toFixed(1)} g`} />
          <Stat label="Z transferów" value={formatPln(invested)} />
          <Stat
            label="Wartość realna"
            value={formatPln(marketValue)}
            sub={`${pnl >= 0 ? "+" : ""}${formatPln(pnl)}`}
            subPositive={pnl >= 0}
          />
        </div>
      </div>

      {portfolio?.has_mismatch && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="font-medium">Rozjazd transferów i Vault</p>
            <p className="mt-0.5 text-amber-800">
              Transfery na ZŁOTO: {formatPln(portfolio.transfer_net_pln)} · Suma zakupów
              monet: {formatPln(portfolio.vault_purchase_value_pln)} · Różnica:{" "}
              {formatPln(portfolio.mismatch_pln)}
            </p>
          </div>
        </div>
      )}

      {portfolio && (
        <PortfolioValueEditor
          portfolioId={portfolio.id}
          label="Wartość realna portfela złota"
          value={portfolio.manual_market_value_pln}
          hint={`Wycena monet w Vault (spot + marża): ${formatPln(vaultCurrentTotal)}`}
        />
      )}
    </header>
  );
}

function Stat({
  label,
  value,
  sub,
  subPositive,
}: {
  label: string;
  value: string;
  sub?: string;
  subPositive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">{value}</p>
      {sub && (
        <p
          className={cn(
            "text-[11px] font-medium tabular-nums",
            subPositive ? "text-emerald-600" : "text-red-600"
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
