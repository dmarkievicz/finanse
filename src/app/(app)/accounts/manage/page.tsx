import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { AccountsManageTable } from "@/components/accounts/accounts-manage-table";
import { createClient } from "@/lib/supabase/server";
import { fetchAccountsManage } from "@/lib/queries/accounts";
import { ArrowLeft, Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AccountsManagePage() {
  const supabase = await createClient();
  const data = await fetchAccountsManage(supabase);

  return (
    <div>
      <PageHeader
        title="Zarządzanie kontami"
        description={`${data.accounts.length} kont w historii · ${data.activeCount} aktywnych · ${data.archivedCount} archiwalnych`}
      />

      <Link
        href="/accounts"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do bieżących kont
      </Link>

      {data.needsReviewCount > 0 && (
        <div className="mb-6 flex gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
          <Info className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">
              {data.needsReviewCount} kont wymaga uporządkowania po imporcie
            </p>
            <p className="mt-1 text-amber-800/90">
              Zaznacz konta, które używasz obecnie, i kliknij „Aktywuj zaznaczone”. Stare konta
              pozostaną w historii transakcji, ale nie będą widoczne na pulpicie. Potem ustaw{" "}
              <Link href="/accounts/opening" className="font-medium underline">
                salda początkowe
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <AccountsManageTable accounts={data.accounts} />
    </div>
  );
}
