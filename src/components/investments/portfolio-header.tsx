import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { InvestmentPortfolioRow } from "@/lib/queries/investment-portfolios";
import { PortfolioValueEditor } from "@/components/investments/portfolio-value-editor";

interface PortfolioHeaderProps {
  portfolio: InvestmentPortfolioRow;
  description: string;
  badge: string;
}

export function PortfolioHeader({ portfolio, description, badge }: PortfolioHeaderProps) {
  const pnl = portfolio.pnl_pln;

  return (
    <header className="space-y-4">
      <Link
        href="/investments"
        className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Inwestycje
      </Link>
      <div>
        <span className="inline-block rounded-full border border-border bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          {badge}
        </span>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{portfolio.display_name}</h1>
        <p className="mt-1 max-w-xl text-[14px] text-muted">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Z transferów" value={formatPln(portfolio.transfer_net_pln)} />
        <Stat label="Wartość realna" value={formatPln(portfolio.market_value_pln)} />
        <Stat
          label="Zysk / strata"
          value={`${pnl >= 0 ? "+" : ""}${formatPln(pnl)}`}
          positive={pnl >= 0}
        />
      </div>
      <PortfolioValueEditor
        portfolioId={portfolio.id}
        label="Wartość realna (override)"
        value={portfolio.manual_market_value_pln}
      />
    </header>
  );
}

function Stat({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums",
          positive === true && "text-emerald-600",
          positive === false && "text-red-600",
          positive === undefined && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
