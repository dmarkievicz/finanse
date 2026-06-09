import type { CurrencySlice } from "@/lib/queries/dashboard";

interface CurrencyExposureProps {
  currencies: CurrencySlice[];
}

export function CurrencyExposure({ currencies }: CurrencyExposureProps) {
  if (currencies.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="font-semibold text-foreground">Waluty</h3>
        <p className="mt-1 text-xs text-muted">Ekspozycja na PLN, EUR, USD</p>
        <p className="mt-4 text-sm text-muted">Brak danych o ekspozycji walutowej</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="font-semibold text-foreground">Waluty</h3>
      <p className="mt-1 text-xs text-muted">Udział sald kont wg waluty bazowej konta</p>
      <div className="mt-4 space-y-3">
        {currencies.map((c) => (
          <div key={c.code}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">{c.code}</span>
              <span className="text-muted">{c.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{ width: `${c.pct}%`, background: c.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
