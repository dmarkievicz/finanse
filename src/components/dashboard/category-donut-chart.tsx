import type { DonutSlice } from "@/lib/dashboard/budget-metrics";
import { formatPln } from "@/lib/format";

interface CategoryDonutChartProps {
  title: string;
  slices: DonutSlice[];
  total: number;
  accent: "income" | "expense";
}

export function CategoryDonutChart({ title, slices, total, accent }: CategoryDonutChartProps) {
  const size = 108;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const accentColor = accent === "income" ? "#059669" : "#e11d48";

  return (
    <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="text-xs tabular-nums text-muted">Razem {formatPln(total)}</span>
      </div>

      {slices.length === 0 || total === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Brak danych w okresie</p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative mx-auto shrink-0 sm:mx-0">
            <svg width={size} height={size} className="-rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#f1f5f9"
                strokeWidth={stroke}
              />
              {slices.map((slice) => {
                const len = (slice.pct / 100) * circumference;
                const el = (
                  <circle
                    key={slice.name}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={slice.color}
                    strokeWidth={stroke}
                    strokeDasharray={`${len} ${circumference - len}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += len;
                return el;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-muted">Razem</span>
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: accentColor }}
              >
                {formatPln(total)}
              </span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-2">
            {slices.map((slice) => (
              <li
                key={slice.name}
                className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 text-xs"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate text-slate-700">{slice.name}</span>
                </span>
                <span className="text-right tabular-nums text-slate-600">
                  {formatPln(slice.value)}
                  <span className="ml-1 text-muted">({slice.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
