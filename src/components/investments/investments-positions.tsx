import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  groupPositionsByCategory,
  type InvestmentPosition,
} from "@/lib/queries/investments";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface InvestmentsPositionsProps {
  positions: InvestmentPosition[];
}

export function InvestmentsPositions({ positions }: InvestmentsPositionsProps) {
  const groups = groupPositionsByCategory(positions);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
        Brak kont inwestycyjnych.{" "}
        <Link href="/accounts/new" className="font-medium text-accent hover:underline">
          Dodaj konto
        </Link>{" "}
        typu broker / lokata lub{" "}
        <Link href="/investments/new" className="font-medium text-accent hover:underline">
          instrument
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-foreground">Konta inwestycyjne</h3>
        <p className="text-xs text-muted">Salda z przepływów gotówki — bez zysków rynkowych</p>
      </div>

      {groups.map((group) => (
        <section key={group.category} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ background: `${group.color}12`, borderColor: `${group.color}30` }}
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: group.color }} />
              <h4 className="font-semibold text-foreground">{group.category}</h4>
              <span className="text-xs text-muted">({group.items.length})</span>
            </div>
            <span className="text-sm font-semibold">{formatPln(group.total)}</span>
          </div>
          <ul className="divide-y divide-border/60">
            {group.items.map((p) => (
              <li
                key={p.account_id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50/50"
              >
                <div>
                  <p className="font-medium text-foreground">{p.account_name}</p>
                  <p className="text-xs text-muted">{p.currency}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      p.balance_pln < 0 ? "text-red-600" : "text-foreground"
                    )}
                  >
                    {formatPln(p.balance_pln)}
                  </span>
                  <Link
                    href={`/transactions?account=${p.account_id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                  >
                    Transakcje
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
