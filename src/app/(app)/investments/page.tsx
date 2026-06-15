import Link from "next/link";
import { Gem, Blocks, TrendingUp } from "lucide-react";
import { PageContainer, PageToolbar } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { InvestmentsSummary } from "@/components/investments/investments-summary";
import { createClient } from "@/lib/supabase/server";
import {
  ensureInvestmentPortfolios,
  fetchInvestmentPortfolios,
} from "@/lib/queries/investment-portfolios";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PORTFOLIO_LINKS = {
  gold: { href: "/investments/bullion", icon: Gem, color: "text-amber-600 bg-amber-50" },
  lego: { href: "/investments/collectibles", icon: Blocks, color: "text-slate-600 bg-slate-50" },
  etf: { href: "/investments/etf", icon: TrendingUp, color: "text-indigo-600 bg-indigo-50" },
} as const;

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  await ensureInvestmentPortfolios(supabase, user.id);
  const portfolios = await fetchInvestmentPortfolios(supabase);
  const totalPln = portfolios.reduce((s, p) => s + p.market_value_pln, 0);

  return (
    <PageContainer>
      <PageHeader
        title="Inwestycje"
        description="Portfele oparte na transferach z Excela. Wartość realną możesz nadpisać ręcznie."
      />

      <InvestmentsSummary
        totalPln={totalPln}
        positionCount={portfolios.length}
        asOfDate={new Date().toISOString().slice(0, 10)}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {portfolios.map((p) => {
          const link = PORTFOLIO_LINKS[p.portfolio_kind];
          const Icon = link.icon;
          return (
            <Link
              key={p.id}
              href={link.href}
              className="rounded-xl border border-border/80 bg-card p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    link.color
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-foreground">{p.display_name}</h2>
                  <p className="mt-1 text-[13px] text-muted">
                    Z transferów: {formatPln(p.transfer_net_pln)}
                  </p>
                  <p className="mt-2 text-lg font-bold tabular-nums text-foreground">
                    {formatPln(p.market_value_pln)}
                  </p>
                  <p
                    className={cn(
                      "text-[13px] font-medium tabular-nums",
                      p.pnl_pln >= 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {p.pnl_pln >= 0 ? "+" : ""}
                    {formatPln(p.pnl_pln)}
                  </p>
                  {p.has_mismatch && (
                    <p className="mt-2 text-[12px] text-amber-700">⚠ Rozjazd z Vault</p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {portfolios.length === 0 && (
        <p className="text-[14px] text-muted">
          Brak portfeli — zaimportuj transfery na konta ZŁOTO, LEGO lub ETF.
        </p>
      )}
    </PageContainer>
  );
}
