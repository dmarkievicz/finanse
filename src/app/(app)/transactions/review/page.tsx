import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ReviewQueue } from "@/components/transactions/review-queue";
import { createClient } from "@/lib/supabase/server";
import { fetchTransactions } from "@/lib/queries/transactions";
import { fetchLookupData } from "@/lib/queries/transaction-detail";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TransactionsReviewPage() {
  const supabase = await createClient();
  const [data, lookup] = await Promise.all([
    fetchTransactions(supabase, { page: 1, reviewOnly: true, pageSize: 200 }),
    fetchLookupData(supabase),
  ]);

  return (
    <div>
      <PageHeader
        title="Transakcje do poprawy"
        description={`${data.total.toLocaleString("pl-PL")} pozycji wymaga przeglądu po imporcie`}
      />

      <Link
        href="/transactions"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wszystkie transakcje
      </Link>

      <ReviewQueue items={data.items} categories={lookup.categories} />
    </div>
  );
}
