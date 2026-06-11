import Link from "next/link";
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: "default" | "green" | "red" | "gold";
  href?: string;
}

const accentStyles = {
  default: "from-primary/10 to-primary/5 text-primary",
  green: "from-emerald-500/15 to-emerald-500/5 text-emerald-600",
  red: "from-red-500/15 to-red-500/5 text-red-600",
  gold: "from-amber-500/15 to-amber-500/5 text-amber-600",
};

export function KpiCard({ label, value, sub, icon: Icon, trend, accent = "default", href }: KpiCardProps) {
  const inner = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition",
        href && "hover:border-primary/30 hover:shadow-md cursor-pointer"
      )}
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br",
            accentStyles[accent]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trend.positive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            )}
          >
            {trend.positive ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      {href && (
        <p className="mt-2 text-xs font-medium text-accent opacity-0 transition group-hover:opacity-100">
          Zobacz szczegóły →
        </p>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}
