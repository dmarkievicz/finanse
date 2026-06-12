import {
  Wallet,
  Droplets,
  TrendingUp,
  TrendingDown,
  Scale,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";
import { SummaryCard, SummaryCardGrid, type SummaryCardTone } from "@/components/layout";
import type { DashboardKpi } from "@/lib/queries/dashboard";
import { formatKpiDelta, formatKpiPercentChange } from "@/lib/queries/dashboard";
import { previousPeriodCompareLabel, type DashboardPeriod } from "@/lib/dashboard/period";
import { formatPln, formatPercent } from "@/lib/format";

interface DashboardKpiGridProps {
  kpis: DashboardKpi;
  period: DashboardPeriod;
  periodFrom: string;
  periodTo: string;
}

interface KpiItem {
  label: string;
  value: string;
  sub: string;
  delta: string | undefined;
  deltaPositive: boolean;
  icon: LucideIcon;
  tone: SummaryCardTone;
  href?: string;
  mutedValue?: boolean;
}

function previousValue(current: number, change: number | null): number | null {
  if (change == null) return null;
  return current - change;
}

export function DashboardKpiGrid({ kpis, period, periodFrom, periodTo }: DashboardKpiGridProps) {
  const compareLabel = previousPeriodCompareLabel(period);

  const items: KpiItem[] = [
    {
      label: "Majątek netto",
      value: formatPln(kpis.netWorth),
      sub: "Aktywa − zobowiązania",
      delta: formatKpiPercentChange(
        kpis.netWorth,
        previousValue(kpis.netWorth, kpis.netWorthChange),
        compareLabel
      ),
      deltaPositive: (kpis.netWorthChange ?? 0) >= 0,
      icon: Wallet,
      tone: "primary",
      href: "/accounts",
    },
    {
      label: "Aktywa płynne",
      value: formatPln(kpis.liquidAssets),
      sub: "Gotówka i rachunki",
      delta: formatKpiPercentChange(
        kpis.liquidAssets,
        previousValue(kpis.liquidAssets, kpis.liquidAssetsChange),
        compareLabel
      ),
      deltaPositive: (kpis.liquidAssetsChange ?? 0) >= 0,
      icon: Droplets,
      tone: "info",
      href: "/accounts?type=bank",
    },
    {
      label: "Przychody",
      value: formatPln(kpis.income),
      sub: "Wpływy w okresie",
      delta: formatKpiPercentChange(
        kpis.income,
        previousValue(kpis.income, kpis.incomeChange),
        compareLabel
      ),
      deltaPositive: (kpis.incomeChange ?? 0) >= 0,
      icon: TrendingUp,
      tone: "positive",
      href: `/transactions?type=income&period=custom&from=${periodFrom}&to=${periodTo}`,
      mutedValue: kpis.income === 0,
    },
    {
      label: "Wydatki",
      value: formatPln(kpis.expenses),
      sub: "Wydatki w okresie",
      delta: formatKpiPercentChange(
        kpis.expenses,
        previousValue(kpis.expenses, kpis.expensesChange),
        compareLabel
      ),
      deltaPositive: (kpis.expensesChange ?? 0) <= 0,
      icon: TrendingDown,
      tone: "negative",
      href: `/transactions?type=expense&period=custom&from=${periodFrom}&to=${periodTo}`,
      mutedValue: kpis.expenses === 0,
    },
    {
      label: "Nadwyżka",
      value: formatPln(kpis.surplus),
      sub: "Przychody − wydatki",
      delta: formatKpiPercentChange(
        kpis.surplus,
        previousValue(kpis.surplus, kpis.surplusChange),
        compareLabel
      ),
      deltaPositive: (kpis.surplusChange ?? 0) >= 0,
      icon: Scale,
      tone: kpis.surplus >= 0 ? "positive" : "negative",
      href: `/transactions?period=custom&from=${periodFrom}&to=${periodTo}`,
      mutedValue: kpis.surplus === 0,
    },
    {
      label: "Stopa oszczędności",
      value: formatPercent(kpis.savingsRate),
      sub: "Nadwyżka / przychody",
      delta: formatKpiDelta(kpis.savingsRateChange, false)?.replace(
        " vs poprz. okres",
        ` vs ${compareLabel}`
      ),
      deltaPositive: (kpis.savingsRateChange ?? 0) >= 0,
      icon: PiggyBank,
      tone: "warning",
    },
  ];

  return (
    <SummaryCardGrid cols={6}>
      {items.map((item) => (
        <SummaryCard
          key={item.label}
          label={item.label}
          value={item.value}
          sub={item.sub}
          icon={item.icon}
          tone={item.tone}
          href={item.href}
          delta={item.delta}
          deltaPositive={item.deltaPositive}
          mutedValue={item.mutedValue}
        />
      ))}
    </SummaryCardGrid>
  );
}
