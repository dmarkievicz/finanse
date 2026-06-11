import type { CurrencyExposureResult } from "@/lib/dashboard/currency-exposure";
import { formatPln } from "@/lib/format";

interface DashboardCurrencyPanelProps {
  exposure: CurrencyExposureResult;
}

export function DashboardCurrencyPanel({ exposure }: DashboardCurrencyPanelProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <h3 className="font-semibold text-foreground">Ekspozycja walutowa</h3>
      <p className="text-xs text-muted">Udział aktywów według waluty (tylko salda dodatnie)</p>

      {!exposure.isValid && exposure.rows.length === 0 ? (
        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-6 text-center text-sm text-muted">
          {exposure.warning ?? "Brak danych do wyświetlenia udziałów walut."}
        </div>
      ) : (
        <>
          {exposure.warning && (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {exposure.warning}
            </p>
          )}
          <div className="mt-4 space-y-3">
            {exposure.rows
              .filter((r) => r.assetsPln > 0)
              .map((r) => (
                <div key={r.code}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{r.code}</span>
                    <span className="tabular-nums text-muted">
                      {formatPln(r.assetsPln)} · {r.sharePct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${r.sharePct}%`, backgroundColor: r.color }}
                    />
                  </div>
                  {r.liabilitiesPln > 0 && (
                    <p className="mt-0.5 text-[11px] text-red-600">
                      Zobowiązania: {formatPln(r.liabilitiesPln)}
                    </p>
                  )}
                </div>
              ))}
          </div>
          {exposure.totalLiabilities > 0 && (
            <p className="mt-3 text-xs text-muted">
              Łączne zobowiązania: {formatPln(exposure.totalLiabilities)}
            </p>
          )}
        </>
      )}
    </div>
  );
}
