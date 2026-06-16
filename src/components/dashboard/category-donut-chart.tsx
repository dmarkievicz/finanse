import type { DonutSlice } from "@/lib/dashboard/budget-metrics";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CategoryDonutChartProps {
  title: string;
  slices: DonutSlice[];
  total: number;
  accent: "income" | "expense";
  layout?: "default" | "stacked";
}

const VIEW = 120;

export function CategoryDonutChart({
  title,
  slices,
  total,
  accent,
  layout = "default",
}: CategoryDonutChartProps) {
  const stacked = layout === "stacked";
  const stroke = stacked ? 20 : 22;
  const radius = (VIEW - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const accentColor = accent === "income" ? "#059669" : "#e11d48";

  const donut = (
    <div
      className={cn(
        "relative shrink-0",
        stacked ? "size-[9.25rem] lg:size-[10rem]" : "size-[7.5rem]"
      )}
    >
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="h-full w-full -rotate-90">
        <circle
          cx={VIEW / 2}
          cy={VIEW / 2}
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
              cx={VIEW / 2}
              cy={VIEW / 2}
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
      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
        <span className="text-[10px] text-muted">Razem</span>
        <span
          className={cn(
            "font-semibold tabular-nums leading-tight",
            stacked ? "text-sm" : "text-sm"
          )}
          style={{ color: accentColor }}
        >
          {formatPln(total)}
        </span>
      </div>
    </div>
  );

  return (
    <div className={cn(stacked && "flex min-h-0 flex-1 flex-col")}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="shrink-0 text-xs tabular-nums text-muted">Razem {formatPln(total)}</span>
      </div>

      {slices.length === 0 || total === 0 ? (
        <p className="flex flex-1 items-center justify-center py-4 text-center text-sm text-muted">
          Brak danych w okresie
        </p>
      ) : stacked ? (
        <div className="flex min-h-0 flex-1 items-center gap-3 lg:gap-4">
          {donut}
          <ul className="min-h-0 min-w-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
            {slices.map((slice) => (
              <LegendRow key={slice.name} slice={slice} compact={false} />
            ))}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          {donut}
          <ul className="min-w-0 flex-1 space-y-1.5">
            {slices.map((slice) => (
              <LegendRow key={slice.name} slice={slice} compact={false} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LegendRow({ slice, compact }: { slice: DonutSlice; compact: boolean }) {
  return (
    <li
      className={cn(
        "flex items-center justify-between gap-2",
        compact ? "text-[11px]" : "text-[12px]"
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: slice.color }}
        />
        <span className="truncate text-slate-700">{slice.name}</span>
      </span>
      <span className="shrink-0 tabular-nums text-slate-600">
        {formatPln(slice.value)}{" "}
        <span className="text-muted">({slice.pct}%)</span>
      </span>
    </li>
  );
}
