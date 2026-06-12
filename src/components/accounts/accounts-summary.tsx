import { Landmark, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { SummaryCard, SummaryCardGrid } from "@/components/layout";
import { formatPln } from "@/lib/format";
import type { AccountRow } from "@/lib/queries/accounts";

interface AccountsSummaryProps {
  accounts: AccountRow[];
  netWorth: number;
  asOfDate: string;
}

export function AccountsSummary({ accounts, netWorth, asOfDate }: AccountsSummaryProps) {
  const positive = accounts.filter((a) => a.balance > 0);
  const negative = accounts.filter((a) => a.balance < 0);
  const totalPositive = positive.reduce((s, a) => s + a.balance, 0);
  const totalNegative = negative.reduce((s, a) => s + a.balance, 0);

  return (
    <SummaryCardGrid cols={4}>
      <SummaryCard
        label="Majątek netto"
        value={formatPln(netWorth)}
        sub={`stan na ${asOfDate}`}
        icon={Wallet}
        tone="primary"
      />
      <SummaryCard
        label="Konta"
        value={String(accounts.length)}
        sub={`${positive.length} dodatnich · ${negative.length} ujemnych`}
        icon={Landmark}
        tone="info"
      />
      <SummaryCard
        label="Suma dodatnich"
        value={formatPln(totalPositive)}
        sub="aktywa"
        icon={TrendingUp}
        tone="positive"
        mutedValue={totalPositive === 0}
      />
      <SummaryCard
        label="Suma ujemnych"
        value={formatPln(totalNegative)}
        sub="zobowiązania"
        icon={TrendingDown}
        tone="negative"
        mutedValue={totalNegative === 0}
      />
    </SummaryCardGrid>
  );
}
