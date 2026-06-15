import { Blocks } from "lucide-react";
import { formatPln } from "@/lib/format";

interface CollectiblesHeroProps {
  itemCount: number;
  totalInvested: number;
  totalDisplayValue: number;
}

export function CollectiblesHero({
  itemCount,
  totalInvested,
  totalDisplayValue,
}: CollectiblesHeroProps) {
  const pnl = totalDisplayValue - totalInvested;
  return (
    <header className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-600/20">
          <Blocks className="h-6 w-6 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kolekcje LEGO</h1>
          <p className="mt-1 max-w-xl text-[13px] text-stone-400">
            Inwestycje kolekcjonerskie — płatność z konta bankowego, pozycja w inwentarzu (nie konto „LEGO”).
          </p>
        </div>
      </div>
      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-stone-500">Pozycje</dt>
          <dd className="text-xl font-semibold tabular-nums">{itemCount}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-stone-500">Zainwestowano</dt>
          <dd className="text-xl font-semibold tabular-nums">{formatPln(totalInvested)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-stone-500">Wartość szacunkowa</dt>
          <dd className="text-xl font-semibold tabular-nums">
            {formatPln(totalDisplayValue)}
            {itemCount > 0 && (
              <span className={`ml-2 text-sm ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ({pnl >= 0 ? "+" : ""}
                {formatPln(pnl)})
              </span>
            )}
          </dd>
        </div>
      </dl>
    </header>
  );
}
