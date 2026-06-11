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

export function DashboardKpiGrid({ kpis, periodFrom, periodTo }: DashboardKpiGridProps) {
  const items: KpiItem[] = [
    {
      label: "Majątek netto",
      value: formatPln(kpis.netWorth),
      sub: "Aktywa − zobowiązania",
      delta: formatKpiDelta(kpis.netWorthChange),
      positive: (kpis.netWorthChange ?? 0) >= 0,
      icon: Wallet,
      accent: "border-l-slate-400",
      href: "/accounts",
    },
    {
      label: "Aktywa płynne",
      value: formatPln(kpis.liquidAssets),
      sub: "Gotówka i bank",
      delta: formatKpiDelta(kpis.liquidAssetsChange),
      positive: (kpis.liquidAssetsChange ?? 0) >= 0,
      icon: Droplets,
      accent: "border-l-sky-300",
      href: "/accounts?type=bank",
    },
    {
      label: "Przychody",
      value: formatPln(kpis.income),
      sub: "W okresie",
      delta: formatKpiDelta(kpis.incomeChange),
      positive: (kpis.incomeChange ?? 0) >= 0,
      icon: TrendingUp,
      accent: "border-l-emerald-300",
      href: `/transactions?type=income&period=custom&from=${periodFrom}&to=${periodTo}`,
    },
    {
      label: "Wydatki",
      value: formatPln(kpis.expenses),
      sub: "W okresie",
      delta: formatKpiDelta(kpis.expensesChange),
      positive: (kpis.expensesChange ?? 0) <= 0,
      icon: TrendingDown,
      accent: "border-l-rose-300",
      href: `/transactions?type=expense&period=custom&from=${periodFrom}&to=${periodTo}`,
    },
    {
      label: "Nadwyżka",
      value: formatPln(kpis.surplus),
      sub: "Przychody − wydatki",
      delta: formatKpiDelta(kpis.surplusChange),
      positive: (kpis.surplusChange ?? 0) >= 0,
      icon: Scale,
      accent: kpis.surplus >= 0 ? "border-l-emerald-300" : "border-l-rose-300",
      href: `/transactions?period=custom&from=${periodFrom}&to=${periodTo}`,
    },
    {
      label: "Oszczędności",
      value: formatPercent(kpis.savingsRate),
      sub: "Nadwyżka / przychody",
      delta: formatKpiDelta(kpis.savingsRateChange, false),
      positive: (kpis.savingsRateChange ?? 0) >= 0,
      icon: PiggyBank,
      accent: "border-l-amber-300",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const card = (
          <div
            className={cn(
              "group flex h-full flex-col border-l-[3px] rounded-xl border border-slate-200/90 bg-white px-4 py-4 transition",
              item.accent,
              item.href && "hover:border-slate-300 hover:shadow-sm"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-500">
                <item.icon className="h-4 w-4 stroke-[1.5]" />
                <span className="text-[13px] font-medium text-slate-600">{item.label}</span>
              </div>
              {item.delta && (
                <span
                  className={cn(
                    "text-[11px] font-medium tabular-nums",
                    item.positive ? "text-emerald-600" : "text-rose-600"
                  )}
                >
                  {item.delta.replace(" vs poprz. okres", "")}
                </span>
              )}
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
              {item.value}
            </p>
            <p className="mt-0.5 text-[12px] text-slate-400">{item.sub}</p>
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
