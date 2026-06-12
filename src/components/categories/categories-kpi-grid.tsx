import {
  TrendingDown,
  TrendingUp,
  Layers,
  AlertTriangle,
  FolderOpen,
  Target,
} from "lucide-react";
import { SummaryCard, SummaryCardGrid } from "@/components/layout";
import type { CategoriesKpis } from "@/lib/queries/category-analytics";
import { formatPln } from "@/lib/format";

interface CategoriesKpiGridProps {
  kpis: CategoriesKpis;
  periodLabel: string;
}

export function CategoriesKpiGrid({ kpis, periodLabel }: CategoriesKpiGridProps) {
  return (
    <SummaryCardGrid cols={6}>
      <SummaryCard
        label="Wydatki"
        value={formatPln(kpis.expenseTotal)}
        sub={periodLabel}
        icon={TrendingDown}
        tone="negative"
        href="/categories?tab=expense"
        mutedValue={kpis.expenseTotal === 0}
      />
      <SummaryCard
        label="Przychody"
        value={formatPln(kpis.incomeTotal)}
        sub={periodLabel}
        icon={TrendingUp}
        tone="positive"
        href="/categories?tab=income"
        mutedValue={kpis.incomeTotal === 0}
      />
      <SummaryCard
        label="Największa kategoria"
        value={kpis.topExpenseName ?? "—"}
        sub={kpis.topExpenseAmount > 0 ? formatPln(kpis.topExpenseAmount) : "Brak wydatków"}
        icon={Target}
        tone="neutral"
      />
      <SummaryCard
        label="Aktywne kategorie"
        value={String(kpis.activeCount)}
        sub="Z transakcjami w okresie"
        icon={Layers}
        tone="info"
      />
      <SummaryCard
        label="Bez transakcji"
        value={String(kpis.emptyCount)}
        sub="Ukryte domyślnie"
        icon={FolderOpen}
        tone="neutral"
        href="/categories?showEmpty=1"
      />
      <SummaryCard
        label="Przekroczony budżet"
        value={String(kpis.overBudgetCount)}
        sub={
          kpis.uncategorizedExpenseCount > 0
            ? `${kpis.uncategorizedExpenseCount} bez kategorii (wyd.)`
            : "W okresie"
        }
        icon={AlertTriangle}
        tone="warning"
        href="/categories?tab=budgeted"
      />
    </SummaryCardGrid>
  );
}
