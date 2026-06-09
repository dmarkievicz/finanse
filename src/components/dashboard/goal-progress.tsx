import { formatPln } from "@/lib/format";

interface GoalProgressProps {
  name: string;
  current: number;
  target: number;
  targetDate?: string | null;
}

export function GoalProgress({ name, current, target, targetDate }: GoalProgressProps) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const dateLabel = targetDate
    ? new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(
        new Date(targetDate + "T00:00:00")
      )
    : null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-primary">Cel</p>
          <h3 className="mt-1 font-semibold text-foreground">{name}</h3>
          {dateLabel && <p className="text-xs text-muted">Termin: {dateLabel}</p>}
        </div>
        <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-white">{pct}%</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/80">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-muted">
        <span className="font-semibold text-foreground">{formatPln(current)}</span> z {formatPln(target)}
      </p>
    </div>
  );
}
