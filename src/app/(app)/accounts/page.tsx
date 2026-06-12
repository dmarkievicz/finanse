import { PageContainer, ButtonLink, PageToolbar } from "@/components/layout";
import { AccountsPageContent } from "@/components/accounts/accounts-page-content";
import { createClient } from "@/lib/supabase/server";
import { fetchAccountsPageData } from "@/lib/queries/fetch-accounts-page";
import { CalendarDays, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();
  const data = await fetchAccountsPageData(supabase);

  return (
    <PageContainer>
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Konta i salda</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Zarządzaj swoimi kontami, sprawdzaj salda i miej pełną kontrolę nad finansami.
          </p>
        </div>
        <PageToolbar>
          <ButtonLink href="/accounts/new" variant="primary">
            <Plus className="h-4 w-4" />
            Nowe konto
          </ButtonLink>
          <ButtonLink href="/accounts/opening">
            <CalendarDays className="h-4 w-4" />
            Salda początkowe
          </ButtonLink>
        </PageToolbar>
      </header>

      <AccountsPageContent data={data} />
    </PageContainer>
  );
}
