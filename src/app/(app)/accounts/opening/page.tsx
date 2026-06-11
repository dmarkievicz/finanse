import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { OpeningBalancesForm } from "@/components/accounts/opening-balances-form";
import { createClient } from "@/lib/supabase/server";
import { fetchAccountsManage } from "@/lib/queries/accounts";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OpeningBalancesPage() {
  const supabase = await createClient();
  const data = await fetchAccountsManage(supabase);

  return (
    <div>
      <PageHeader
        title="Salda początkowe"
        description="Ustaw rzeczywisty stan aktywnych kont na wybraną datę startu"
      />

      <Link
        href="/accounts"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do kont
      </Link>

      <OpeningBalancesForm
        accounts={data.accounts}
        analysisStartDate={data.analysisStartDate}
      />
    </div>
  );
}
