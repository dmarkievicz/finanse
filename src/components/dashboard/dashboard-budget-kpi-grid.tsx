import type { ReactNode } from "react";
import { Calendar, Gauge, Scale, TrendingDown, TrendingUp } from "lucide-react";
import { formatPln, formatPercent } from "@/lib/format";
import type { BudgetDashboardSelection } from "@/lib/dashboard/budget-period";
import { cn } from "@/lib/utils";

interface DashboardBudgetKpiGridProps {
  selection: BudgetDashboardSelection;
  completionPct: number | null;
  balance: number;
  performanceTitle: string;
  performanceSubtitle: string;
  performancePositive: boolean;
}

export function DashboardBudgetKpiGrid({
  selection,
  completionPct,
  balance,
  performanceTitle,
  performanceSubtitle,
  performancePositive,
}: DashboardBudgetKpiGridProps) {
  const progressPct = completionPct != null ? Math.min(100, Math.max(0, completionPct)) : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={Calendar}
        label="Wybrany okres"
        value={selection.yearLabel}
        sub={`Okres: ${selection.periodLabel}`}
        iconTone="slate"
      />
      <KpiCard
        icon={Gauge}
        label="Postęp okresu"
        value={completionPct != null ? formatPercent(completionPct) : "—"}
        sub={
          completionPct != null
            ? selection.isTotalYear
              ? "udział minionych miesięcy roku"
              : "udział minionych dni miesiąca"
            : "niedostępne dla całej historii"
        }
        iconTone="slate"
        footer={
          progressPct != null ? (
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-700 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          ) : null
        }
      />
      <KpiCard
        icon={Scale}
        label="Bilans okresu"
        value={formatPln(balance)}
        sub="przychody minus wydatki"
        iconTone={balance >= 0 ? "emerald" : "rose"}
        valueTone={balance >= 0 ? "positive" : "negative"}
      />
      <KpiCard
        icon={performancePositive ? TrendingUp : TrendingDown}
        label="Wynik okresu"
        value={performanceTitle}
        sub={performanceSubtitle}
        iconTone={performancePositive ? "emerald" : "rose"}
        valueTone={performancePositive ? "positive" : "negative"}
      />
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconTone,
  valueTone = "neutral",
  footer,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  sub: string;
  iconTone: "slate" | "emerald" | "rose";
  valueTone?: "neutral" | "positive" | "negative";
  footer?: ReactNode;
}) {
  const iconStyles = {
    slate: "bg-slate-100 text-slate-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };

  const valueStyles = {
    neutral: "text-slate-900",
    positive: "text-emerald-700",
    negative: "text-rose-600",
  };

  return (
    <div className="flex h-full min-h-[7.25rem] flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
          <p
            className={cn(
              "mt-1.5 text-xl font-semibold leading-tight tracking-tight tabular-nums",
              valueStyles[valueTone]
            )}
          >
            {value}
          </p>
          <p className="mt-1 text-xs leading-snug text-muted">{sub}</p>
        </div>
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconStyles[iconTone]
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {footer}
    </div>
  );
}
