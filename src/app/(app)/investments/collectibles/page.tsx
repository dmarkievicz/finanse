import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchCollectibleItemsForPortfolio } from "@/lib/collectibles/add-collectible-item";
import {
  ensureInvestmentPortfolios,
  fetchPortfolioByKind,
} from "@/lib/queries/investment-portfolios";
import { PortfolioPageShell } from "@/components/investments/portfolio-page-shell";
import { PortfolioHeader } from "@/components/investments/portfolio-header";
import { CollectiblesAddForm } from "@/components/investments/collectibles/collectibles-add-form";
import { formatPln } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CollectiblesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  await ensureInvestmentPortfolios(supabase, user.id);
  const portfolio = await fetchPortfolioByKind(supabase, "lego");
  const items = portfolio
    ? await fetchCollectibleItemsForPortfolio(supabase, portfolio.id)
    : [];

  return (
    <PortfolioPageShell>
      {portfolio ? (
        <PortfolioHeader
          portfolio={portfolio}
          badge="Kolekcje"
          description="Kapitał z transferów Excela (np. Revolut → LEGO). Zestawy to szczegóły inwentarza."
        />
      ) : (
        <p className="text-muted">Brak portfela LEGO — utwórz konto LEGO i zaimportuj transfery.</p>
      )}

      <CollectiblesAddForm />

      {items.length > 0 && (
        <section className="rounded-xl border border-border/80 bg-card shadow-sm">
          <h2 className="border-b border-border/60 px-4 py-3 text-[15px] font-semibold sm:px-5">
            Zestawy ({items.length})
          </h2>
          <ul className="divide-y divide-border/60">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
                <Link href={`/investments/${item.id}`} className="min-w-0 hover:text-primary">
                  <p className="font-medium text-foreground">{item.name}</p>
                  {item.set_number && (
                    <p className="text-[12px] text-muted">#{item.set_number}</p>
                  )}
                </Link>
                <div className="text-right text-[13px] tabular-nums">
                  <p>{formatPln(item.current_value_pln)}</p>
                  <p className={item.pnl_pln >= 0 ? "text-emerald-600" : "text-red-600"}>
                    {item.pnl_pln >= 0 ? "+" : ""}
                    {formatPln(item.pnl_pln)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </PortfolioPageShell>
  );
}
