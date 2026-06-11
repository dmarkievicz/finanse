import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransactionsFilters } from "@/components/transactions/transactions-filters";
import { TransactionSearch } from "@/components/transactions/transaction-search";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchTransactions, fetchCategoryName } from "@/lib/queries/transactions";
import { fetchAccountName } from "@/lib/queries/accounts";
import { formatMonthLabel } from "@/lib/format";
import type { TransactionType } from "@/types/database";

export const dynamic = "force-dynamic";

interface TransactionsPageProps {
  searchParams: Promise<{
    page?: string;
    type?: string;
    review?: string;
    account?: string;
    category?: string;
    month?: string;
    q?: string;
    status?: string;
  }>;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const type = (params.type ?? "all") as TransactionType | "all";
  const reviewOnly = params.review === "1";
  const accountId = params.account;
  const categoryId = params.category;
  const month = params.month;
  const search = params.q;
  const status = params.status ?? "all";

  const supabase = await createClient();
  const [accountName, categoryName] = await Promise.all([
    accountId ? fetchAccountName(supabase, accountId) : null,
    categoryId ? fetchCategoryName(supabase, categoryId) : null,
  ]);

  const filterState = {
    type,
    reviewOnly,
    accountId,
    accountName,
    categoryId,
    categoryName,
    month,
    status,
    search,
  };

  const data = await fetchTransactions(supabase, {
    page,
    type,
    reviewOnly,
    accountId,
    categoryId,
    month,
    search,
    status: reviewOnly ? undefined : status,
  });

  const parts = [`${data.total.toLocaleString("pl-PL")} wpisów`];
  if (month) parts.push(formatMonthLabel(month));
  if (categoryName) parts.push(`kategoria: ${categoryName}`);
  if (accountName) parts.push(`konto: ${accountName}`);

  return (
    <div>
      <PageHeader
        title="Transakcje"
        description={parts.join(" · ")}
        action={
          <Link
            href="/transactions/new"
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Nowa transakcja
          </Link>
        }
      />
      <Suspense fallback={null}>
        <TransactionSearch />
      </Suspense>
      <TransactionsFilters state={filterState} needsReviewCount={data.needsReviewCount} />
      <TransactionsTable
        items={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        filterState={filterState}
      />
    </div>
  );
}
