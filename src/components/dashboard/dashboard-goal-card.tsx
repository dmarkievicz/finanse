import Link from "next/link";
import { Calendar, ChevronRight } from "lucide-react";
import { formatPln } from "@/lib/format";
import type { GoalMetrics } from "@/lib/dashboard/goal-metrics";
import { cn } from "@/lib/utils";
import { DashboardPanel } from "@/components/dashboard/dashboard-ui";

interface DashboardGoalCardProps {
  name: string;
  current: number;
  target: number;
  targetDate: string | null;
  metrics: GoalMetrics;
}

const statusDot = {
  on_track: "bg-emerald-400",
  ahead: "bg-sky-400",
  behind: "bg-amber-400",
  completed: "bg-emerald-500",
};

export function DashboardGoalCard({
  name,
  current,
  target,
  targetDate,
  metrics,
}: DashboardGoalCardProps) {
  const dateLabel = targetDate
    ? new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
        new Date(targetDate + "T00:00:00")
      )
    : null;

  const notStarted = current < 0;
  const progressPct = notStarted ? 0 : metrics.pct;

  return (
    <DashboardPanel className="h-full">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium uppercase tracking-wide text-slate-400">
            Cel finansowy
          </p>
          <h3 className="mt-1 text-[15px] font-semibold text-slate-800">{name}</h3>
        </div>
        <div className="flex items-center gap-2">
          {notStarted ? (
            <span className="text-sm font-medium text-amber-600">0%</span>
          ) : (
            <span className="text-2xl font-semibold tabular-nums text-slate-900">
              {metrics.pct}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            notStarted ? "bg-amber-400" : "bg-[#1e3a5f]"
          )}
          style={{ width: `${Math.min(100, progressPct)}%` }}
        />
      </div>

      {notStarted && (
        <p className="mt-3 text-[13px] leading-snug text-amber-700">{metrics.statusLabel}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <div>
          <p className="text-[11px] text-slate-400">Obecnie</p>
          <p className="text-[15px] font-semibold tabular-nums text-slate-800">
            {formatPln(current)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Brakuje do celu</p>
          <p className="text-[15px] font-semibold tabular-nums text-slate-800">
            {formatPln(metrics.remaining)}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Wymagane / mies.</p>
          <p className="text-[15px] font-semibold tabular-nums text-slate-800">
            {metrics.monthlyRequired != null ? formatPln(metrics.monthlyRequired) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-400">Cel</p>
          <p className="text-[15px] font-semibold tabular-nums text-slate-800">
            {formatPln(target)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-[12px] text-slate-500">
        <div className="flex flex-wrap items-center gap-3">
          {!notStarted && (
            <span className="inline-flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", statusDot[metrics.status])} />
              {metrics.statusLabel}
            </span>
          )}
          {dateLabel && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Termin: {dateLabel}
            </span>
          )}
        </div>
        <Link
          href="/settings#cel"
          className="inline-flex items-center gap-0.5 font-medium text-slate-600 hover:text-slate-900"
        >
          Szczegóły celu
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </DashboardPanel>
  );
}
