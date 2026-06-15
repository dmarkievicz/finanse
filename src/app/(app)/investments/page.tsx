import Link from "next/link";
import { Plus, Gem, Blocks } from "lucide-react";
import { ButtonLink, PageContainer, PageToolbar } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { InvestmentsSummary } from "@/components/investments/investments-summary";
import { InvestmentsAllocation } from "@/components/investments/investments-allocation";
import { InvestmentsOverviewSections } from "@/components/investments/investments-overview-sections";
import { createClient } from "@/lib/supabase/server";
import { fetchInvestmentsOverview } from "@/lib/queries/investments-overview";

export const dynamic = "force-dynamic";

export default async function InvestmentsPage() {
  const supabase = await createClient();
  const data = await fetchInvestmentsOverview(supabase);

  return (
    <PageContainer>
      <PageHeader
        title="Inwestycje"
        description="Pełny portfel: XTB, obligacje, lokaty, złoto, LEGO i inne — z alokacją i zyskiem."
        action={
          <PageToolbar>
            <Link
              href="/investments/bullion"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-slate-50"
            >
              <Gem className="h-4 w-4 text-amber-600" />
              Bulion Vault
            </Link>
            <Link
              href="/investments/collectibles"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm hover:bg-slate-50"
            >
              <Blocks className="h-4 w-4 text-rose-600" />
              LEGO
            </Link>
            <ButtonLink href="/investments/new" variant="primary">
              <Plus className="h-4 w-4" />
              Instrument
            </ButtonLink>
            <ButtonLink href="/accounts/new">Konto</ButtonLink>
          </PageToolbar>
        }
      />

      <InvestmentsSummary
        totalPln={data.totalPln}
        positionCount={data.positionCount}
        asOfDate={data.asOfDate}
      />

      {data.allocation.length > 0 && (
        <InvestmentsAllocation allocation={data.allocation} totalPln={data.totalPln} />
      )}

      <InvestmentsOverviewSections groups={data.groups} />
    </PageContainer>
  );
}
