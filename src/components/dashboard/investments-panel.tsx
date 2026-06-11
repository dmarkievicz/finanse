import Link from "next/link";
import type { AllocationSlice } from "@/lib/queries/investments";
import { formatPln } from "@/lib/format";

interface InvestmentsPanelProps {
  totalPln: number;
  allocation: AllocationSlice[];
}

export function InvestmentsPanel({ totalPln, allocation }: InvestmentsPanelProps) {
  if (allocation.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-amber-50/30 p-5 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg">📈</span>
          <h3 className="font-semibold text-foreground">Portfel inwestycyjny</h3>
        </div>
        <p className="mt-4 text-sm text-muted">Brak sald na kontach inwestycyjnych</p>
        <Link href="/investments" className="mt-3 inline-block text-xs font-medium text-accent hover:underline">
          Zobacz inwestycje →
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-amber-50/30 p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">📈</span>
          <h3 className="font-semibold text-foreground">Portfel inwestycyjny</h3>
        </div>
        <Link href="/investments" className="text-xs font-medium text-accent hover:underline">
          Szczegóły →
        </Link>
      </div>
      <p className="mb-4 text-xs text-muted">Alokacja wg kont inwestycyjnych</p>
      <p className="text-3xl font-bold tracking-tight text-foreground">{formatPln(totalPln)}</p>
      <div className="mt-4 flex h-3 overflow-hidden rounded-full">
        {allocation.map((a) => (
          <div
            key={a.name}
            style={{ width: `${Math.max(a.pct, 1)}%`, background: a.color }}
            title={`${a.name} ${a.pct}%`}
          />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2">
        {allocation.slice(0, 4).map((a) => (
          <li key={a.name} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
            <span className="text-muted">{a.name}</span>
            <span className="font-medium text-foreground">{a.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
