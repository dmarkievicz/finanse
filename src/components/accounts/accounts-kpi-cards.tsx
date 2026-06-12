import { Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { SummaryCard, SummaryCardGrid } from "@/components/layout";
import { formatDate, formatPln } from "@/lib/format";

interface AccountsKpiCardsProps {
  netWorth: number;
  assets: number;
  liabilities: number;
  activeCount: number;
  asOfDate: string;
}

export function AccountsKpiCards({
  netWorth,
  assets,
  liabilities,
  activeCount,
  asOfDate,
}: AccountsKpiCardsProps) {
  return (
    <SummaryCardGrid cols={4}>
      <SummaryCard
        label="Majątek netto"
        value={formatPln(netWorth)}
        sub={`Stan na ${formatDate(asOfDate)}`}
        icon={Wallet}
        tone="primary"
      />
      <SummaryCard
        label="Aktywa"
        value={formatPln(assets)}
        sub="Suma aktywów"
        icon={TrendingUp}
        tone="positive"
        mutedValue={assets === 0}
      />
      <SummaryCard
        label="Zobowiązania"
        value={formatPln(liabilities)}
        sub="Suma zobowiązań"
        icon={TrendingDown}
        tone="negative"
        mutedValue={liabilities === 0}
      />
      <SummaryCard
        label="Konta aktywne"
        value={String(activeCount)}
        sub="Aktywne konta"
        icon={Landmark}
        tone="info"
      />
    </SummaryCardGrid>
  );
}
