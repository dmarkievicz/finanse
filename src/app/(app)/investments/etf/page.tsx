import { createClient } from "@/lib/supabase/server";
import {
  ensureInvestmentPortfolios,
  fetchPortfolioByKind,
} from "@/lib/queries/investment-portfolios";
import { PortfolioPageShell } from "@/components/investments/portfolio-page-shell";
import { PortfolioHeader } from "@/components/investments/portfolio-header";

export const dynamic = "force-dynamic";

export default async function EtfPortfolioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureInvestmentPortfolios(supabase, user.id);
  const portfolio = await fetchPortfolioByKind(supabase, "etf");

  return (
    <PortfolioPageShell>
      {portfolio ? (
        <PortfolioHeader
          portfolio={portfolio}
          badge="ETF"
          description="Kapitał z transferów Excela (np. mBank → ETF). Wartość realną wpisujesz ręcznie — zysk liczy się od sumy transferów."
        />
      ) : (
        <p className="text-muted">
          Brak portfela ETF — utwórz konto „ETF” w systemie i zaimportuj transfery z Excela.
        </p>
      )}
    </PortfolioPageShell>
  );
}
