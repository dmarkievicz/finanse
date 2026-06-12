import type { DonutSlice } from "@/lib/dashboard/budget-metrics";
import { formatPln } from "@/lib/format";
import { SectionCard, SectionCardHeader } from "@/components/layout";

interface CategoryDonutChartProps {
  title: string;
  slices: DonutSlice[];
  total: number;
  accent: "income" | "expense";
}

export function CategoryDonutChart({ title, slices, total, accent }: CategoryDonutChartProps) {
  const size = 120;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const accentColor = accent === "income" ? "#10b981" : "#f43f5e";

  return (
    <SectionCard>
      <SectionCardHeader title={title} subtitle={`Razem ${formatPln(total)}`} />
      {slices.length === 0 || total === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Brak danych w okresie</p>
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
                    strokeLinecap="butt"
                  />
                );
                offset += len;
                return el;
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] text-slate-400">Razem</span>
              <span className="text-sm font-semibold tabular-nums" style={{ color: accentColor }}>
                {formatPln(total)}
              </span>
            </div>
          </div>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {slices.map((slice) => (
              <li key={slice.name} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate text-slate-700">{slice.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-600">
                  {formatPln(slice.value)}{" "}
                  <span className="text-slate-400">({slice.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
