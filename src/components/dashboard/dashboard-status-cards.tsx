import { Calendar, Gauge, Scale, TrendingUp } from "lucide-react";
import { formatPln, formatPercent } from "@/lib/format";
import type { BudgetDashboardSelection } from "@/lib/dashboard/budget-period";
import { cn } from "@/lib/utils";

interface DashboardStatusCardsProps {
  selection: BudgetDashboardSelection;
  completionPct: number | null;
  balance: number;
  performanceText: string;
  performancePositive: boolean;
}

export function DashboardStatusCards({
  selection,
  completionPct,
  balance,
  performanceText,
  performancePositive,
}: DashboardStatusCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatusCard
        icon={Calendar}
        label="Wybrany rok i okres"
        value={`${selection.yearLabel}`}
        sub={`Okres: ${selection.periodLabel}`}
        tone="neutral"
      />
      <StatusCard
        icon={Gauge}
        label="Postęp okresu"
        value={completionPct != null ? formatPercent(completionPct) : "—"}
        sub={
          completionPct != null
            ? selection.isTotalYear
              ? "Udział minionych miesięcy roku"
              : "Udział minionych dni miesiąca"
            : "Niedostępne dla całej historii"
        }
        tone="neutral"
      />
      <StatusCard
        icon={Scale}
        label="Bilans okresu"
        value={formatPln(balance)}
        sub="przychody minus wydatki"
        tone={balance >= 0 ? "positive" : "negative"}
      />
      <StatusCard
        icon={TrendingUp}
        label="Wynik okresu"
        value={formatPln(balance)}
        sub={performanceText}
        tone={performancePositive ? "positive" : "negative"}
        highlight
      />
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
  highlight,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
  sub: string;
  tone: "neutral" | "positive" | "negative";
  highlight?: boolean;
}) {
  const valueClass =
    tone === "positive"
      ? "text-emerald-700"
      : tone === "negative"
        ? "text-rose-600"
        : "text-slate-900";

  return (
    <div
      className={cn(
        "rounded-xl border bg-white p-4 shadow-sm",
        highlight ? "border-[#1e3a5f]/20 ring-1 ring-[#1e3a5f]/10" : "border-slate-200"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
            {label}
          </p>
          <p className={cn("mt-1 text-xl font-semibold tabular-nums", valueClass)}>{value}</p>
          <p className="mt-0.5 text-[12px] text-slate-500">{sub}</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50">
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
      </div>
    </div>
  );
}
