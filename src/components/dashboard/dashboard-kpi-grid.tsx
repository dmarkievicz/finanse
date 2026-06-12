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
import { formatKpiDelta } from "@/lib/queries/dashboard";
import { formatPln, formatPercent } from "@/lib/format";

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
  deltaPositive: boolean;
  icon: LucideIcon;
  tone: SummaryCardTone;
  href?: string;
  mutedValue?: boolean;
}

export function DashboardKpiGrid({ kpis, periodFrom, periodTo }: DashboardKpiGridProps) {
  const items: KpiItem[] = [
    {
      label: "Majątek netto",
      value: formatPln(kpis.netWorth),
      sub: "Aktywa − zobowiązania",
      delta: formatKpiDelta(kpis.netWorthChange),
      deltaPositive: (kpis.netWorthChange ?? 0) >= 0,
      icon: Wallet,
      tone: "primary",
      href: "/accounts",
    },
    {
      label: "Aktywa płynne",
      value: formatPln(kpis.liquidAssets),
      sub: "Gotówka i bank",
      delta: formatKpiDelta(kpis.liquidAssetsChange),
      deltaPositive: (kpis.liquidAssetsChange ?? 0) >= 0,
      icon: Droplets,
      tone: "info",
      href: "/accounts?type=bank",
    },
    {
      label: "Przychody",
      value: formatPln(kpis.income),
      sub: "W okresie",
      delta: formatKpiDelta(kpis.incomeChange),
      deltaPositive: (kpis.incomeChange ?? 0) >= 0,
      icon: TrendingUp,
      tone: "positive",
      href: `/transactions?type=income&period=custom&from=${periodFrom}&to=${periodTo}`,
      mutedValue: kpis.income === 0,
    },
    {
      label: "Wydatki",
      value: formatPln(kpis.expenses),
      sub: "W okresie",
      delta: formatKpiDelta(kpis.expensesChange),
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
      delta: formatKpiDelta(kpis.surplusChange),
      deltaPositive: (kpis.surplusChange ?? 0) >= 0,
      icon: Scale,
      tone: kpis.surplus >= 0 ? "positive" : "negative",
      href: `/transactions?period=custom&from=${periodFrom}&to=${periodTo}`,
      mutedValue: kpis.surplus === 0,
    },
    {
      label: "Oszczędności",
      value: formatPercent(kpis.savingsRate),
      sub: "Nadwyżka / przychody",
      delta: formatKpiDelta(kpis.savingsRateChange, false),
      deltaPositive: (kpis.savingsRateChange ?? 0) >= 0,
      icon: PiggyBank,
      tone: "warning",
    },
  ];

  return (
    <SummaryCardGrid cols={4}>
      {items.map((item) => (
        <SummaryCard
          key={item.label}
          label={item.label}
          value={item.value}
          sub={item.sub}
          icon={item.icon}
          tone={item.tone}
          href={item.href}
          delta={item.delta?.replace(" vs poprz. okres", "")}
          deltaPositive={item.deltaPositive}
          mutedValue={item.mutedValue}
        />
      ))}
    </SummaryCardGrid>
  );
}
