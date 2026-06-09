const months = ["Paź", "Lis", "Gru", "Sty", "Lut", "Mar"];

// Placeholder — po imporcie dane z bazy
const income = [14200, 15800, 18450, 17200, 16900, 18450];
const expenses = [11800, 12400, 12870, 13100, 11900, 12870];
const max = Math.max(...income, ...expenses);

function toY(val: number, h: number) {
  return h - (val / max) * (h - 20) - 10;
}

export function CashflowChart() {
  const w = 400;
  const h = 160;
  const step = w / (months.length - 1);

  const incomePath = income
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(v, h)}`)
    .join(" ");
  const expensePath = expenses
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${toY(v, h)}`)
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
        <span className="absolute right-0 top-0 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
          Podgląd — dane po imporcie
        </span>
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
          {income.map((v, i) => (
            <circle key={`i-${i}`} cx={i * step} cy={toY(v, h)} r={4} fill="#10b981" />
          ))}
          {expenses.map((v, i) => (
            <circle key={`e-${i}`} cx={i * step} cy={toY(v, h)} r={4} fill="#f87171" />
          ))}
        </svg>
        <div className="mt-2 flex justify-between text-[11px] text-muted">
          {months.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
