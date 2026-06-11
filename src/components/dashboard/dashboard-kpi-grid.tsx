import Link from "next/link";
import {
  Wallet,
  Droplets,
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import type { DashboardKpi } from "@/lib/queries/dashboard";
import { formatKpiDelta } from "@/lib/queries/dashboard";
import { formatPln, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DashboardKpiGridProps {
  kpis: DashboardKpi;
  periodFrom: string;
  periodTo: string;
}

interface KpiItem {
  label: string;
  value: string;
  sub: string;
  delta: string | undefined;
  positive: boolean;
  icon: LucideIcon;
  accent: string;
  href?: string;
}

export function DashboardKpiGrid({
  kpis,
  periodFrom,
  periodTo,
}: DashboardKpiGridProps) {
  const items: KpiItem[] = [
    {
      label: "Majątek netto",
      value: formatPln(kpis.netWorth),
      sub: "Aktywa minus zobowiązania",
      delta: formatKpiDelta(kpis.netWorthChange),
      positive: (kpis.netWorthChange ?? 0) >= 0,
      icon: Wallet,
      accent: "text-primary bg-primary/10",
      href: "/accounts",
    },
    {
      label: "Aktywa płynne",
      value: formatPln(kpis.liquidAssets),
      sub: "Gotówka i konta bankowe",
      delta: formatKpiDelta(kpis.liquidAssetsChange),
      positive: (kpis.liquidAssetsChange ?? 0) >= 0,
      icon: Droplets,
      accent: "text-sky-700 bg-sky-50",
      href: "/accounts?type=bank",
    },
    {
      label: "Przychody",
      value: formatPln(kpis.income),
      sub: "Bez transferów wewnętrznych",
      delta: formatKpiDelta(kpis.incomeChange),
      positive: (kpis.incomeChange ?? 0) >= 0,
      icon: TrendingUp,
      accent: "text-emerald-700 bg-emerald-50",
      href: `/transactions?type=income&period=custom&from=${periodFrom}&to=${periodTo}`,
    },
    {
      label: "Wydatki",
      value: formatPln(kpis.expenses),
      sub: "Wydatki konsumpcyjne",
      delta: formatKpiDelta(kpis.expensesChange),
      positive: (kpis.expensesChange ?? 0) <= 0,
      icon: TrendingDown,
      accent: "text-red-700 bg-red-50",
      href: `/transactions?type=expense&period=custom&from=${periodFrom}&to=${periodTo}`,
    },
    {
      label: "Nadwyżka / deficyt",
      value: formatPln(kpis.surplus),
      sub: "Przychody minus wydatki",
      delta: formatKpiDelta(kpis.surplusChange),
      positive: (kpis.surplusChange ?? 0) >= 0,
      icon: Scale,
      accent: kpis.surplus >= 0 ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50",
      href: `/transactions?period=custom&from=${periodFrom}&to=${periodTo}`,
    },
    {
      label: "Stopa oszczędności",
      value: formatPercent(kpis.savingsRate),
      sub: "Nadwyżka / przychody",
      delta: formatKpiDelta(kpis.savingsRateChange, false),
      positive: (kpis.savingsRateChange ?? 0) >= 0,
      icon: PiggyBank,
      accent: "text-amber-700 bg-amber-50",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {items.map((item) => {
        const card = (
          <div
            className={cn(
              "group h-full rounded-xl border border-border bg-card p-4 shadow-sm transition",
              item.href && "hover:border-primary/30 hover:shadow-md"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", item.accent)}>
                <item.icon className="h-4 w-4" />
              </div>
              {item.delta && (
                <span
                  className={cn(
                    "text-right text-[11px] font-medium leading-tight",
                    item.positive ? "text-emerald-600" : "text-red-600"
                  )}
                >
                  {item.delta}
                </span>
              )}
            </div>
            <p className="mt-3 text-xs font-medium text-muted">{item.label}</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums tracking-tight text-foreground">
              {item.value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">{item.sub}</p>
          </div>
        );

        return item.href ? (
          <Link key={item.label} href={item.href}>
            {card}
          </Link>
        ) : (
          <div key={item.label}>{card}</div>
        );
      })}
    </div>
  );
}
