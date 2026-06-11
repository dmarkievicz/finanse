import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DashboardInvestments } from "@/lib/queries/dashboard";
import { formatPln } from "@/lib/format";
import {
  DashboardPanel,
  DashboardPanelHeader,
  dashboardLink,
} from "@/components/dashboard/dashboard-ui";

interface DashboardInvestmentsPanelProps {
  investments: DashboardInvestments;
}

export function DashboardInvestmentsPanel({ investments }: DashboardInvestmentsPanelProps) {
  const needsSetup = investments.status === "empty" || investments.status === "needs_config";

  if (needsSetup) {
    return (
      <DashboardPanel>
        <DashboardPanelHeader title="Inwestycje" subtitle="Wymaga konfiguracji" />
        <p className="text-[13px] leading-relaxed text-slate-500">
          {investments.message ??
            "Dodaj instrumenty lub konta inwestycyjne, aby śledzić portfel."}
        </p>
        <Link href="/investments" className={`mt-3 inline-flex items-center gap-1 ${dashboardLink}`}>
          Konfiguruj
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </DashboardPanel>
    );
  }

  return (
    <DashboardPanel>
      <DashboardPanelHeader
        title="Inwestycje"
        subtitle={`${investments.instrumentCount} pozycji`}
        action={
          <Link href="/investments" className={`inline-flex items-center gap-1 ${dashboardLink}`}>
            Szczegóły
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <p className="text-xl font-semibold tabular-nums text-slate-900">
        {formatPln(investments.totalPln)}
      </p>
      {investments.pnlPln != null && (
        <p
          className={`mt-0.5 text-[12px] font-medium tabular-nums ${
            investments.pnlPln >= 0 ? "text-emerald-600" : "text-rose-500"
          }`}
        >
          Zysk/strata: {formatPln(investments.pnlPln)}
        </p>
      )}

      {investments.allocation.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
          {investments.allocation.slice(0, 4).map((a) => (
            <div key={a.name} className="flex items-center justify-between text-[12px]">
              <span className="text-slate-600">{a.name}</span>
              <span className="tabular-nums font-medium text-slate-800">
                {formatPln(a.total)}
              </span>
            </div>
          ))}
        </div>
      )}

      {investments.message && (
        <p className="mt-3 text-[12px] text-amber-600">{investments.message}</p>
      )}
    </DashboardPanel>
  );
}
