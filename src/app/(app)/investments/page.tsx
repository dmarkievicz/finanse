import Link from "next/link";
import { Plus } from "lucide-react";
import { ButtonLink, PageContainer, PageToolbar } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { InvestmentsSummary } from "@/components/investments/investments-summary";
import { InvestmentsAllocation } from "@/components/investments/investments-allocation";
import { InvestmentsPositions } from "@/components/investments/investments-positions";
import { InstrumentsRegistry } from "@/components/investments/instruments-registry";
import { createClient } from "@/lib/supabase/server";
import { fetchInvestments } from "@/lib/queries/investments";
import { fetchInstrumentsPortfolio } from "@/lib/queries/instruments";
import { sortByNamePl } from "@/lib/locale-sort";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const [accountData, instruments] = await Promise.all([
    fetchInvestments(supabase),
    fetchInstrumentsPortfolio(supabase),
  ]);

  const instrumentsTotal = instruments.reduce((s, i) => s + i.market_value_pln, 0);
  const linkedAccountIds = new Set(
    instruments.map((i) => i.account_id).filter((id): id is string => id != null)
  );
  const unlinkedPositions = accountData.positions.filter(
    (p) => !linkedAccountIds.has(p.account_id)
  );
  const unlinkedTotal = unlinkedPositions.reduce((s, p) => s + p.balance_pln, 0);
  const combinedTotal = instrumentsTotal + unlinkedTotal;
  const positionCount = instruments.length + unlinkedPositions.length;

  const allocation =
    instruments.length > 0
      ? (() => {
          const rows = sortByNamePl(
            instruments.map((i) => ({
              name: i.name,
              total: i.market_value_pln,
              pct: 0,
              color: "#1e3a5f",
            })),
            (a) => a.name
          );
          const total = rows.reduce((s, a) => s + a.total, 0);
          return rows.map((a) => ({
            ...a,
            pct: total > 0 ? Math.round((a.total / total) * 100) : 0,
          }));
        })()
      : accountData.allocation;

  return (
    <PageContainer>
      <PageHeader
        title="Inwestycje"
        description="Portfel — ETF, obligacje, złoto (instrument GOLD) i inne pozycje. Złoto nie jest kontem operacyjnym."
        action={
          <PageToolbar>
            <Link
              href="/investments/bullion"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-700 to-amber-600 px-3 py-2 text-sm font-medium text-white shadow-md hover:from-amber-600 hover:to-amber-500"
            >
              Bulion Vault
            </Link>
            <ButtonLink href="/investments/new" variant="primary">
              <Plus className="h-4 w-4" />
              Nowy instrument
            </ButtonLink>
            <ButtonLink href="/accounts/new">Nowe konto</ButtonLink>
          </PageToolbar>
        }
      />

      <InvestmentsSummary
        totalPln={combinedTotal}
        positionCount={positionCount}
        asOfDate={accountData.asOfDate}
      />

      <InstrumentsRegistry instruments={instruments} />

      <InvestmentsPositions positions={unlinkedPositions} />

      {allocation.length > 0 && (
        <InvestmentsAllocation allocation={allocation} totalPln={combinedTotal} />
      )}
    </PageContainer>
  );
}
