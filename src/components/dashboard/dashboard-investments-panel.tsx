import Link from "next/link";
import { ArrowRight, Settings2, TrendingUp } from "lucide-react";
import type { DashboardInvestments } from "@/lib/queries/dashboard";
import { formatPln } from "@/lib/format";

interface DashboardInvestmentsPanelProps {
  investments: DashboardInvestments;
}

export function DashboardInvestmentsPanel({ investments }: DashboardInvestmentsPanelProps) {
  const needsSetup = investments.status === "empty" || investments.status === "needs_config";

  if (needsSetup) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Settings2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">Portfel inwestycyjny</h3>
            <p className="mt-1 text-sm text-muted">
              {investments.message ??
                "Moduł inwestycji wymaga uzupełnienia danych, aby pokazać wiarygodny portfel."}
            </p>
            <ul className="mt-3 space-y-1 text-xs text-muted">
              <li>· Ustaw salda początkowe kont inwestycyjnych</li>
              <li>· Dodaj instrumenty (ETF, obligacje, lokaty)</li>
              <li>· Uzupełnij aktualne wyceny</li>
            </ul>
            <Link
              href="/investments"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Przejdź do inwestycji
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Portfel inwestycyjny</h3>
          <p className="text-xs text-muted">
            {investments.instrumentCount} pozycji
            {investments.status === "partial" && " · wymaga uzupełnienia wycen"}
          </p>
        </div>
        <Link
          href="/investments"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Szczegóły
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-2xl font-bold tabular-nums">{formatPln(investments.totalPln)}</p>
          {investments.pnlPln != null && (
            <p
              className={`mt-0.5 inline-flex items-center gap-1 text-sm font-medium ${
                investments.pnlPln >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Zysk/strata: {formatPln(investments.pnlPln)}
            </p>
          )}
        </div>
      </div>

      {investments.allocation.length > 0 && (
        <div className="mt-4">
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100">
            {investments.allocation.map((a) => (
              <div
                key={a.name}
                style={{ width: `${a.pct}%`, backgroundColor: a.color }}
                title={`${a.name}: ${a.pct}%`}
              />
            ))}
          </div>
          <div className="mt-3 space-y-1.5">
            {investments.allocation.slice(0, 5).map((a) => (
              <div key={a.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: a.color }} />
                  {a.name}
                </span>
                <span className="tabular-nums font-medium">
                  {formatPln(a.total)} ({a.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {investments.message && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {investments.message}
        </p>
      )}
    </div>
  );
}
