import type { CashflowMonth } from "@/lib/queries/dashboard";

interface CashflowChartProps {
  data: CashflowMonth[];
}

function toY(val: number, h: number, max: number) {
  if (max === 0) return h / 2;
  return h - (val / max) * (h - 20) - 10;
}

export function CashflowChart({ data }: CashflowChartProps) {
  const w = 400;
  const h = 160;
  const max = Math.max(...data.flatMap((d) => [d.income, d.expenses]), 1);
  const step = data.length > 1 ? w / (data.length - 1) : w;

  const incomePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(d.income, h, max)}`)
    .join(" ");
  const expensePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(d.expenses, h, max)}`)
    .join(" ");

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Przepływy pieniężne</h3>
          <p className="text-xs text-muted">Przychody vs wydatki — ostatnie 6 miesięcy</p>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Przychody
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            Wydatki
          </span>
        </div>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
          {[0.25, 0.5, 0.75].map((p) => (
            <line
              key={p}
              x1={0}
              y1={h * p}
              x2={w}
              y2={h * p}
              stroke="#e2e8f0"
              strokeWidth={1}
            />
          ))}
          <path d={expensePath} fill="none" stroke="#f87171" strokeWidth={2.5} strokeLinecap="round" />
          <path d={incomePath} fill="none" stroke="#10b981" strokeWidth={2.5} strokeLinecap="round" />
          {data.map((d, i) => (
            <circle key={`i-${i}`} cx={i * step} cy={toY(d.income, h, max)} r={4} fill="#10b981" />
          ))}
          {data.map((d, i) => (
            <circle key={`e-${i}`} cx={i * step} cy={toY(d.expenses, h, max)} r={4} fill="#f87171" />
          ))}
        </svg>
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          {data.map((d) => (
            <span key={d.label}>{d.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
