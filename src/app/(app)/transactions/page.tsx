import { PageHeader } from "@/components/page-header";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { createClient } from "@/lib/supabase/server";
import { fetchTransactions } from "@/lib/queries/transactions";
import type { TransactionType } from "@/types/database";

interface TransactionsPageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
    review?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const type = (params.type ?? "all") as TransactionType | "all";
  const reviewOnly = params.review === "1";

  const supabase = await createClient();
  const data = await fetchTransactions(supabase, { page, type, reviewOnly });

  return (
    <div>
      <PageHeader
        title="Transakcje"
        description={`${data.total.toLocaleString("pl-PL")} wpisów w bazie · import z Excela`}
      />
      <TransactionsFilters
        currentType={type}
        reviewOnly={reviewOnly}
        needsReviewCount={data.needsReviewCount}
      />
      <TransactionsTable
        items={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        currentType={type}
        reviewOnly={reviewOnly}
      />
    </div>
  );
}
