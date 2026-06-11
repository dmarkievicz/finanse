import type { CurrencyExposureResult } from "@/lib/dashboard/currency-exposure";
import { formatPln } from "@/lib/format";
import { DashboardEmpty, DashboardPanel, DashboardPanelHeader } from "@/components/dashboard/dashboard-ui";

interface DashboardCurrencyPanelProps {
  exposure: CurrencyExposureResult;
}

export function DashboardCurrencyPanel({ exposure }: DashboardCurrencyPanelProps) {
  return (
    <DashboardPanel>
      <DashboardPanelHeader title="Waluty" subtitle="Udział aktywów (tylko dodatnie)" />

      {!exposure.isValid && exposure.rows.length === 0 ? (
        <DashboardEmpty>{exposure.warning ?? "Brak danych"}</DashboardEmpty>
      ) : (
        <div className="space-y-3">
          {exposure.warning && (
            <p className="text-[12px] text-amber-600">{exposure.warning}</p>
          )}
          {exposure.rows
            .filter((r) => r.assetsPln > 0)
            .map((r) => (
              <div key={r.code}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="font-medium text-slate-700">{r.code}</span>
                  <span className="tabular-nums text-slate-500">
                    {formatPln(r.assetsPln)} · {r.sharePct}%
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full opacity-70"
                    style={{ width: `${r.sharePct}%`, backgroundColor: r.color }}
                  />
                </div>
              </div>
            ))}
        </div>
      )}
    </DashboardPanel>
  );
}
