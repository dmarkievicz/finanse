import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SummaryCardTone =
  | "neutral"
  | "positive"
  | "negative"
  | "warning"
  | "primary"
  | "info";

const toneMap: Record<
  SummaryCardTone,
  { iconBg: string; iconColor: string; value: string }
> = {
  neutral: {
    iconBg: "bg-slate-50",
    iconColor: "text-slate-500",
    value: "text-foreground",
  },
  positive: {
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    value: "text-emerald-700",
  },
  negative: {
    iconBg: "bg-red-50",
    iconColor: "text-red-600",
    value: "text-red-700",
  },
  warning: {
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
    value: "text-amber-800",
  },
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    value: "text-foreground",
  },
  info: {
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
    value: "text-foreground",
  },
};

export interface SummaryCardProps {
  label: string;
  value: string;
  sub?: string | null;
  icon?: LucideIcon;
  tone?: SummaryCardTone;
  href?: string;
  delta?: string;
  deltaPositive?: boolean;
  className?: string;
  /** Wartość zerowa — neutralny wygląd zamiast koloru semantycznego */
  mutedValue?: boolean;
}

export function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
  href,
  delta,
  deltaPositive,
  className,
  mutedValue,
}: SummaryCardProps) {
  const styles = toneMap[tone];
  const valueClass = mutedValue ? "text-muted-foreground" : styles.value;

  const inner = (
    <div
      className={cn(
        "flex min-h-[7.5rem] flex-col justify-between rounded-xl border border-border bg-card p-5 shadow-sm",
        href && "transition hover:border-slate-300 hover:shadow-md",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className={cn("mt-1 text-2xl font-semibold tabular-nums tracking-tight", valueClass)}>
            {value}
          </p>
          {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
        </div>
        {Icon && (
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              mutedValue ? "bg-slate-50" : styles.iconBg
            )}
          >
            <Icon
              className={cn("h-5 w-5", mutedValue ? "text-slate-400" : styles.iconColor)}
            />
          </div>
        )}
      </div>
      {delta && (
        <p
          className={cn(
            "mt-2 text-xs font-medium tabular-nums",
            deltaPositive ? "text-emerald-600" : "text-red-600"
          )}
        >
          {delta}
        </p>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {inner}
      </Link>
    );
  }
  return inner;
}

type SummaryCardGridCols = 2 | 3 | 4 | 6;

const gridColsClass: Record<SummaryCardGridCols, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 xl:grid-cols-4",
  6: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
};

export function SummaryCardGrid({
  children,
  cols = 4,
  className,
}: {
  children: ReactNode;
  cols?: SummaryCardGridCols;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4", gridColsClass[cols], className)}>
      {children}
    </div>
  );
}
