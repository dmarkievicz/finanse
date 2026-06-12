import Link from "next/link";
import { PageContainer, ButtonLink, PageToolbar } from "@/components/layout";
import { PageHeader } from "@/components/page-header";
import { AccountsSummary } from "@/components/accounts/accounts-summary";
import { AccountsCurrencyBoard } from "@/components/accounts/accounts-currency-board";
import { buildAccountSections } from "@/lib/accounts/currency-groups";
import { createClient } from "@/lib/supabase/server";
import { fetchAccounts, fetchAccountsManage } from "@/lib/queries/accounts";
import { Plus, Settings2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const supabase = await createClient();
  const [data, manage] = await Promise.all([
    fetchAccounts(supabase),
    fetchAccountsManage(supabase),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Konta"
        description={`${data.accounts.length} aktywnych kont · bankowe, walutowe, gotówka, inwestycje`}
        action={
          <PageToolbar>
            <ButtonLink href="/accounts/new" variant="primary">
              <Plus className="h-4 w-4" />
              Nowe konto
            </ButtonLink>
            <ButtonLink href="/accounts/manage">
              <Settings2 className="h-4 w-4" />
              Zarządzaj
              {manage.needsReviewCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">
                  {manage.needsReviewCount}
                </span>
              )}
            </ButtonLink>
            <ButtonLink href="/accounts/opening">Salda początkowe</ButtonLink>
          </PageToolbar>
        }
      />

      {manage.needsReviewCount > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
          {manage.needsReviewCount} kont z importu czeka na aktywację.{" "}
          <Link href="/accounts/manage" className="font-medium underline">
            Zarządzaj kontami
          </Link>
        </div>
      )}

      <AccountsSummary
        accounts={data.accounts}
        netWorth={data.netWorth}
        asOfDate={data.asOfDate}
      />
      <AccountsCurrencyBoard sections={buildAccountSections(data.accounts)} />
    </PageContainer>
  );
}
