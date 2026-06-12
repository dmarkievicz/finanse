import Link from "next/link";
import { ArrowLeft, Gem } from "lucide-react";
import { formatPln } from "@/lib/format";

interface BullionHeroProps {
  itemCount: number;
  totalInvested: number;
  totalSpotValue: number | null;
  totalFineGrams: number;
  totalSpotPnl: number | null;
}

export function BullionHero({
  itemCount,
  totalInvested,
  totalSpotValue,
  totalFineGrams,
  totalSpotPnl,
}: BullionHeroProps) {
  return (
    <header className="mb-8">
      <Link
        href="/investments"
        className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-amber-200/60 transition hover:text-amber-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Inwestycje
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-amber-300">
            <Gem className="h-3 w-3" />
            Bulion Vault
          </div>
          <h1 className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
            Twój sejf złota
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-stone-400">
            Monety i sztabki to <strong className="font-medium text-stone-300">inwestycje</strong>, nie
            konta. Płacisz z banku (mBank, ING…) — środki schodzą z konta, a bulion ląduje w
            inwentarzu z wyceną na żywo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat label="Pozycje" value={String(itemCount)} />
          <HeroStat label="Czyste Au" value={`${totalFineGrams.toFixed(1)} g`} />
          <HeroStat label="Zainwestowano" value={formatPln(totalInvested)} />
          <HeroStat
            label="Wartość spot"
            value={totalSpotValue != null ? formatPln(totalSpotValue) : "—"}
            sub={
              totalSpotPnl != null
                ? `${totalSpotPnl >= 0 ? "+" : ""}${formatPln(totalSpotPnl)}`
                : undefined
            }
            subPositive={totalSpotPnl != null ? totalSpotPnl >= 0 : undefined}
          />
        </div>
      </div>
    </header>
  );
}

function HeroStat({
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
    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-stone-100">{value}</p>
      {sub && (
        <p
          className={`text-[11px] font-medium tabular-nums ${
            subPositive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
