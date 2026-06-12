import Link from "next/link";
import { Lightbulb, PieChart } from "lucide-react";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountsSummaryPanelProps {
  netWorth: number;
  assets: number;
  liabilities: number;
  cash: number;
  investments: number;
}

function DonutChart({
  slices,
  centerLabel,
  centerValue,
}: {
  slices: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
}) {
  const total = slices.reduce((s, x) => s + Math.abs(x.value), 0);
  const size = 140;
  const stroke = 24;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={stroke}
          />
          {total > 0 &&
            slices.map((slice) => {
              const len = (Math.abs(slice.value) / total) * circumference;
              const el = (
                <circle
                  key={slice.label}
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] text-slate-400">{centerLabel}</span>
          <span className="text-sm font-semibold tabular-nums text-foreground">
            {centerValue}
          </span>
        </div>
      </div>
      <ul className="w-full space-y-2 text-[12px]">
        {slices.map((slice) => (
          <li key={slice.label} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-slate-700">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: slice.color }}
              />
              {slice.label}
            </span>
            <span className="tabular-nums text-slate-600">{formatPln(slice.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AccountsSummaryPanel({
  netWorth,
  assets,
  liabilities,
  cash,
  investments,
}: AccountsSummaryPanelProps) {
  const slices = [
    { label: "Aktywa", value: assets, color: "#10b981" },
    { label: "Zobowiązania", value: liabilities, color: "#f43f5e" },
    { label: "Gotówka", value: cash, color: "#3b82f6" },
    { label: "Inwestycje", value: investments, color: "#6366f1" },
  ].filter((s) => s.value !== 0);

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-border/80 bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <PieChart className="h-4 w-4 text-slate-600" />
          </div>
          <h2 className="text-[15px] font-semibold text-foreground">Podsumowanie</h2>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <DonutChart
            slices={slices}
            centerLabel="Majątek netto"
            centerValue={formatPln(netWorth)}
          />
          <div className="mt-4 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="text-slate-700">Majątek netto</span>
              <span
                className={cn(
                  "tabular-nums",
                  netWorth < 0 ? "text-red-600" : "text-foreground"
                )}
              >
                {formatPln(netWorth)}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-slate-50/50 shadow-sm">
        <div className="flex gap-3 px-4 py-4 sm:px-5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <Lightbulb className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Wskazówka</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">
              Ustaw salda początkowe, aby śledzić historię swoich finansów od początku.
            </p>
            <Link
              href="/accounts/opening"
              className="mt-2 inline-block text-[13px] font-medium text-primary hover:underline"
            >
              Dowiedz się więcej →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
