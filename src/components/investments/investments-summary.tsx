import { PieChart, TrendingUp, Wallet } from "lucide-react";
import { formatPln } from "@/lib/format";

interface InvestmentsSummaryProps {
  totalPln: number;
  positionCount: number;
  asOfDate: string;
}

export function InvestmentsSummary({ totalPln, positionCount, asOfDate }: InvestmentsSummaryProps) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-amber-50/40 p-5 shadow-sm sm:col-span-2">
        <div className="flex items-center gap-2 text-amber-700">
          <TrendingUp className="h-5 w-5" />
          <span className="text-sm font-medium">Wartość portfela inwestycyjnego</span>
        </div>
        <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">{formatPln(totalPln)}</p>
        <p className="mt-1 text-sm text-muted">
          Instrumenty + konta bez powiązania · stan na {asOfDate}
        </p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Wallet className="h-5 w-5" />
        </div>
        <p className="mt-3 text-sm text-muted">Pozycje</p>
        <p className="text-2xl font-bold text-foreground">{positionCount}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted">
          <PieChart className="h-3 w-3" />
          Rejestr + konta
        </p>
      </div>
    </div>
  );
}
