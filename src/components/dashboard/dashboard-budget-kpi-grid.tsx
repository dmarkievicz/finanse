import type { ReactNode } from "react";
import {
  Calendar,
  Droplets,
  Gauge,
  PiggyBank,
  Scale,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { formatPln, formatPercent } from "@/lib/format";
import type { BudgetDashboardSelection } from "@/lib/dashboard/budget-period";
import { cn } from "@/lib/utils";

interface DashboardBudgetKpiGridProps {
  selection: BudgetDashboardSelection;
  completionPct: number | null;
  balance: number;
  performanceSubtitle: string;
  performancePositive: boolean;
  netWorth: number;
  liquidAssets: number;
  savingsRate: number;
  biggestExpenseName: string | null;
  biggestExpenseAmount: number;
}

export function DashboardBudgetKpiGrid({
  selection,
  completionPct,
  balance,
  performanceSubtitle,
  performancePositive,
  netWorth,
  liquidAssets,
  savingsRate,
  biggestExpenseName,
  biggestExpenseAmount,
}: DashboardBudgetKpiGridProps) {
  const progressPct = completionPct != null ? Math.min(100, Math.max(0, completionPct)) : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        icon={Calendar}
        label="Wybrany rok i okres"
        value={selection.yearLabel}
        sub={`Okres: ${selection.periodLabel}`}
        iconTone="slate"
        valueTone="neutral"
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
        valueTone="neutral"
        footer={
          progressPct != null ? (
            <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-600 transition-all"
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
        value={formatPln(balance)}
        sub={performanceSubtitle}
        iconTone={performancePositive ? "emerald" : "rose"}
        valueTone={performancePositive ? "positive" : "negative"}
      />
      <KpiCard
        icon={Wallet}
        label="Majątek netto"
        value={formatPln(netWorth)}
        sub="aktywa minus zobowiązania"
        iconTone="slate"
        valueTone={netWorth >= 0 ? "positive" : "negative"}
      />
      <KpiCard
        icon={Droplets}
        label="Aktywa płynne"
        value={formatPln(liquidAssets)}
        sub="gotówka i rachunki"
        iconTone="slate"
        valueTone="neutral"
      />
      <KpiCard
        icon={PiggyBank}
        label="Stopa oszczędności"
        value={formatPercent(savingsRate)}
        sub="nadwyżka / przychody"
        iconTone="slate"
        valueTone={savingsRate >= 0 ? "positive" : "negative"}
      />
      <KpiCard
        icon={ShoppingBag}
        label="Największy wydatek miesiąca"
        value={biggestExpenseAmount > 0 ? formatPln(biggestExpenseAmount) : "—"}
        sub={biggestExpenseName ?? "brak wydatków w okresie"}
        iconTone="rose"
        valueTone="negative"
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
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  iconTone: "slate" | "emerald" | "rose";
  valueTone?: "neutral" | "positive" | "negative";
  footer?: ReactNode;
}) {
  const iconStyles = {
    slate: "bg-slate-100 text-slate-500",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-500",
  };

  const valueStyles = {
    neutral: "text-slate-900",
    positive: "text-emerald-700",
    negative: "text-rose-600",
  };

  return (
    <div className="flex h-full min-h-[5.75rem] flex-col rounded-xl border border-border bg-card p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
          <p
            className={cn(
              "mt-1 text-lg font-semibold leading-tight tracking-tight tabular-nums",
              valueStyles[valueTone]
            )}
          >
            {value}
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">{sub}</p>
        </div>
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
            iconStyles[iconTone]
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      {footer}
    </div>
  );
}
