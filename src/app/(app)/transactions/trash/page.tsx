import { createClient } from "@/lib/supabase/server";
import { fetchDeletedTransactions } from "@/lib/queries/deleted-transactions";
import { TransactionsTrashPanel } from "@/components/transactions/transactions-trash-panel";

export const dynamic = "force-dynamic";

interface TrashPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function TransactionsTrashPage({ searchParams }: TrashPageProps) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? "1") || 1);

  const supabase = await createClient();
  const data = await fetchDeletedTransactions(supabase, page);

  return (
    <TransactionsTrashPanel
      items={data.items}
      total={data.total}
      page={data.page}
      pageSize={data.pageSize}
    />
  );
}
