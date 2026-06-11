import { createClient } from "@/lib/supabase/server";
import {
  fetchTransactions,
  fetchLookupForFilters,
  fetchCategoryName,
  fetchSubcategoryName,
} from "@/lib/queries/transactions";
import { fetchAccountName } from "@/lib/queries/accounts";
import {
  fetchTransactionDailyBreakdown,
  fetchTransactionSummary,
} from "@/lib/queries/transaction-summary";
import { parseTransactionFilters } from "@/lib/transactions/filter-state";
import { TransactionsView } from "@/components/transactions/transactions-view";

export const dynamic = "force-dynamic";

interface TransactionsPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const parsed = parseTransactionFilters(params);

  const supabase = await createClient();

  const [accountName, categoryName, subcategoryName, sourceName, targetName] =
    await Promise.all([
      parsed.accountId ? fetchAccountName(supabase, parsed.accountId) : null,
      parsed.categoryId ? fetchCategoryName(supabase, parsed.categoryId) : null,
      parsed.subcategoryId ? fetchSubcategoryName(supabase, parsed.subcategoryId) : null,
      parsed.sourceAccountId ? fetchAccountName(supabase, parsed.sourceAccountId) : null,
      parsed.targetAccountId ? fetchAccountName(supabase, parsed.targetAccountId) : null,
    ]);

  const filterState = {
    ...parsed,
    accountName,
    categoryName,
    subcategoryName,
    sourceAccountName: sourceName,
    targetAccountName: targetName,
  };

  const [data, summary, dailyBreakdown, lookup] = await Promise.all([
    fetchTransactions(supabase, { filters: filterState }),
    fetchTransactionSummary(supabase, filterState),
    fetchTransactionDailyBreakdown(supabase, filterState),
    fetchLookupForFilters(supabase),
  ]);

  return (
    <TransactionsView
      items={data.items}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
      filterState={filterState}
      summary={{
        ...summary,
        txCount: summary.txCount || data.total,
      }}
      dailyBreakdown={dailyBreakdown}
      lookup={lookup}
    />
  );
}
