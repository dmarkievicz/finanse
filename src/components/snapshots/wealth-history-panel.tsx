"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import type { PortfolioSnapshotRow } from "@/lib/snapshots/types";
import { formatPln } from "@/lib/format";
import { calcTrendPercent } from "@/lib/queries/dashboard";
import { cn } from "@/lib/utils";
import { DashboardPanel } from "@/components/dashboard/dashboard-ui";

interface WealthHistoryPanelProps {
  snapshots: PortfolioSnapshotRow[];
  currentNetWorth?: number;
}

export function WealthHistoryPanel({ snapshots, currentNetWorth }: WealthHistoryPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.date.localeCompare(b.date)),
    [snapshots]
  );

  const latest = sorted[sorted.length - 1];
  const prev = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
  const displayValue = currentNetWorth ?? latest?.data.net_worth_pln ?? null;

  const snapshotDelta =
    latest && prev
      ? calcTrendPercent(latest.data.net_worth_pln, prev.data.net_worth_pln)
      : undefined;

  const values = sorted.map((s) => s.data.net_worth_pln);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;

  const w = 480;
  const h = 140;
  const pad = { top: 16, bottom: 8, left: 4, right: 4 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const step = sorted.length > 1 ? innerW / (sorted.length - 1) : innerW;

  function y(val: number) {
    return pad.top + innerH - ((val - min) / range) * innerH;
  }

  const linePath = sorted
    .map((s, i) => {
      const x = pad.left + i * step;
      return `${i === 0 ? "M" : "L"} ${x} ${y(s.data.net_worth_pln)}`;
    })
    .join(" ");

  async function capture() {
    setLoading(true);
    try {
      const res = await fetch("/api/snapshots", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  const hovered = hover != null ? sorted[hover] : null;

  return (
    <DashboardPanel className="h-full">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">
            Historia majątku
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
            {displayValue != null ? formatPln(displayValue) : "—"}
          </p>
          {snapshotDelta && (
            <p
              className={cn(
                "mt-0.5 text-[12px] font-medium tabular-nums",
                snapshotDelta.startsWith("+") ? "text-emerald-600" : "text-rose-500"
              )}
            >
              {snapshotDelta} vs poprzedni snapshot
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void capture()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
          Zapisz snapshot
        </button>
      </div>

      {sorted.length < 2 ? (
        <div className="mt-6 flex min-h-[8rem] items-center justify-center rounded-lg bg-slate-50/80 px-4 text-center text-sm text-slate-500">
          Zapisz co najmniej dwa snapshoty, aby zobaczyć zmianę majątku w czasie.
        </div>
      ) : (
        <div className="mt-4">
          {hovered && (
            <div className="mb-2 text-[12px] text-slate-600">
              <span className="font-medium">
                {new Intl.DateTimeFormat("pl-PL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(new Date(hovered.date + "T00:00:00"))}
              </span>
              <span className="ml-2 font-semibold tabular-nums">
                {formatPln(hovered.data.net_worth_pln)}
              </span>
            </div>
          )}
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="Historia majątku">
            <line
              x1={pad.left}
              y1={pad.top + innerH}
              x2={w - pad.right}
              y2={pad.top + innerH}
              stroke="#f1f5f9"
              strokeWidth={1}
            />
            <path
              d={linePath}
              fill="none"
              stroke="#1e3a5f"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {sorted.map((s, i) => {
              const x = pad.left + i * step;
              const cy = y(s.data.net_worth_pln);
              return (
                <g key={s.id}>
                  <circle
                    cx={x}
                    cy={cy}
                    r={hover === i ? 5 : 3}
                    fill="#1e3a5f"
                    className="transition-all"
                  />
                  <rect
                    x={x - 14}
                    y={pad.top}
                    width={28}
                    height={innerH}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  />
                </g>
              );
            })}
          </svg>
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>{sorted[0]?.date.slice(0, 7)}</span>
            <span>{sorted[sorted.length - 1]?.date.slice(0, 7)}</span>
          </div>
        </div>
      )}
    </DashboardPanel>
  );
}
