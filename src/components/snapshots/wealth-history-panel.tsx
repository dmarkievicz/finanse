"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, TrendingUp } from "lucide-react";
import type { PortfolioSnapshotRow } from "@/lib/snapshots/types";
import { formatPln } from "@/lib/format";
import { DashboardPanel } from "@/components/dashboard/dashboard-ui";

interface WealthHistoryPanelProps {
  snapshots: PortfolioSnapshotRow[];
}

export function WealthHistoryPanel({ snapshots }: WealthHistoryPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const values = sorted.map((s) => s.data.net_worth_pln);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const range = max - min || 1;

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

  return (
    <DashboardPanel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">
            Historia majątku
          </p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
            {latest ? formatPln(latest.data.net_worth_pln) : "—"}
          </p>
          <p className="mt-0.5 text-[12px] text-slate-500">
            {sorted.length} snapshotów · majątek netto
          </p>
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
        <p className="mt-4 text-sm text-slate-500">
          Zapisz co najmniej dwa snapshoty, aby zobaczyć wykres zmian majątku w czasie.
        </p>
      ) : (
        <div className="mt-5">
          <div className="flex h-28 items-end gap-1">
            {sorted.map((s) => {
              const h = ((s.data.net_worth_pln - min) / range) * 100;
              return (
                <div key={s.id} className="group flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full min-w-[6px] rounded-t bg-slate-700 transition group-hover:bg-slate-900"
                    style={{ height: `${Math.max(8, h)}%` }}
                    title={`${s.date}: ${formatPln(s.data.net_worth_pln)}`}
                  />
                  <span className="hidden text-[9px] text-slate-400 sm:block">
                    {s.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
            <TrendingUp className="h-3.5 w-3.5" />
            Min {formatPln(min)} · Max {formatPln(max)}
          </div>
        </div>
      )}
    </DashboardPanel>
  );
}
