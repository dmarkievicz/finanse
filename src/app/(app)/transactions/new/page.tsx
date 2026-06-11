import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TransactionCreateForm } from "@/components/transactions/transaction-create-form";
import { createClient } from "@/lib/supabase/server";
import { fetchLookupData } from "@/lib/queries/transaction-detail";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function NewTransactionPage() {
  const supabase = await createClient();
  const lookup = await fetchLookupData(supabase);
  const activeAccounts = lookup.accounts.filter((a) => a.lifecycle_status === "active");

  return (
    <div>
      <PageHeader
        title="Nowa transakcja"
        description="Wydatek, przychód, transfer, przewalutowanie lub korekta"
      />

      <Link
        href="/transactions"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do listy
      </Link>

      <TransactionCreateForm accounts={activeAccounts} categories={lookup.categories} />
    </div>
  );
}
