import Link from "next/link";
import { Target, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import { formatPln } from "@/lib/format";
import type { GoalMetrics } from "@/lib/dashboard/goal-metrics";
import { cn } from "@/lib/utils";

interface DashboardGoalCardProps {
  name: string;
  current: number;
  target: number;
  targetDate: string | null;
  metrics: GoalMetrics;
}

const statusStyles = {
  on_track: "bg-emerald-50 text-emerald-700 border-emerald-200",
  ahead: "bg-sky-50 text-sky-700 border-sky-200",
  behind: "bg-amber-50 text-amber-800 border-amber-200",
  completed: "bg-primary/10 text-primary border-primary/20",
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

  const projectedLabel = metrics.projectedDate
    ? new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
        new Date(metrics.projectedDate + "T00:00:00")
      )
    : null;

  return (
    <Link
      href="/settings#cel"
      className="block rounded-2xl border border-primary/20 bg-gradient-to-br from-slate-50 via-white to-primary/5 p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Cel finansowy
              </p>
              <h3 className="font-semibold text-foreground">{name}</h3>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-muted">Aktualnie</p>
              <p className="text-lg font-bold tabular-nums">{formatPln(current)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Cel</p>
              <p className="text-lg font-bold tabular-nums">{formatPln(target)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Brakuje</p>
              <p className="text-lg font-bold tabular-nums">{formatPln(metrics.remaining)}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Mies. wymagana nadwyżka</p>
              <p className="text-lg font-bold tabular-nums">
                {metrics.monthlyRequired != null ? formatPln(metrics.monthlyRequired) : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-semibold",
              statusStyles[metrics.status]
            )}
          >
            {metrics.statusLabel}
          </span>
          <span className="text-3xl font-bold tabular-nums text-primary">{metrics.pct}%</span>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
            style={{ width: `${Math.min(100, metrics.pct)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        {dateLabel && (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            Termin: {dateLabel}
            {metrics.monthsLeft > 0 && ` (${metrics.monthsLeft} mies.)`}
          </span>
        )}
        {projectedLabel && (
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Prognoza: {projectedLabel}
          </span>
        )}
        {metrics.status === "behind" && (
          <span className="inline-flex items-center gap-1 text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Zwiększ miesięczną nadwyżkę, aby dotrzymać terminu
          </span>
        )}
      </div>
    </Link>
  );
}
