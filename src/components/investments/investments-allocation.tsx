import type { AllocationSlice } from "@/lib/queries/investments";
import { formatPln } from "@/lib/format";

interface InvestmentsAllocationProps {
  allocation: AllocationSlice[];
  totalPln: number;
}

function buildConic(slices: AllocationSlice[]) {
  let acc = 0;
  return slices
    .map((s) => {
      const start = acc;
      acc += s.pct;
      return `${s.color} ${start}% ${acc}%`;
    })
    .join(", ");
}

export function InvestmentsAllocation({ allocation, totalPln }: InvestmentsAllocationProps) {
  if (allocation.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
        Brak danych o alokacji — salda kont inwestycyjnych są zerowe lub nie wykryto kont
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h3 className="font-semibold text-foreground">Alokacja aktywów</h3>
      <p className="text-xs text-muted">Według typu konta / instrumentu</p>
      <div className="mt-4 flex items-center gap-6">
        <div
          className="relative h-36 w-36 shrink-0 rounded-full"
          style={{ background: `conic-gradient(${buildConic(allocation)})` }}
        >
          <div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-card text-center">
            <span className="text-sm font-bold text-foreground">
              {formatPln(totalPln).replace(/\s*zł$/, "")}
            </span>
            <span className="text-[10px] text-muted">zł</span>
          </div>
        </div>
        <ul className="flex-1 space-y-2">
          {allocation.map((a) => (
            <li key={a.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                {a.name}
              </span>
              <span className="font-medium text-muted">
                {a.pct}% · {formatPln(a.total)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
