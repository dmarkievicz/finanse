import Link from "next/link";
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
    <div>
      <PageHeader
        title="Konta"
        description={`${data.accounts.length} aktywnych kont · bankowe, walutowe, gotówka, inwestycje`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/accounts/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
            >
              <Plus className="h-4 w-4" />
              Nowe konto
            </Link>
            <Link
              href="/accounts/manage"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              <Settings2 className="h-4 w-4" />
              Zarządzaj
              {manage.needsReviewCount > 0 && (
                <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-xs text-white">
                  {manage.needsReviewCount}
                </span>
              )}
            </Link>
            <Link
              href="/accounts/opening"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Salda początkowe
            </Link>
          </div>
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
    </div>
  );
}
