import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { createClient } from "@/lib/supabase/server";
import { fetchTransactions } from "@/lib/queries/transactions";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Potwierdzone",
  reconciled: "Pominięte (archiwalne)",
  needs_review: "Do sprawdzenia",
};

interface Props {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function ImportTransactionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = params.status ?? "confirmed";
  const page = Number(params.page ?? "1");

  const supabase = await createClient();
  const data = await fetchTransactions(supabase, {
    page,
    pageSize: 50,
    status,
    filters: {
      type: "all",
      period: "custom",
      view: "list",
      sort: "date",
      sortDir: "desc",
      page,
      includeReconciled: true,
    },
  });

  const filterState = {
    type: "all" as const,
    period: "custom" as const,
    view: "list" as const,
    sort: "date" as const,
    sortDir: "desc" as const,
    page,
    includeReconciled: true,
  };

  return (
    <div>
      <PageHeader
        title={`Transakcje importu — ${STATUS_LABELS[status] ?? status}`}
        description={`${data.total.toLocaleString("pl-PL")} transakcji`}
      />
      <Link
        href="/imports"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do Importu
      </Link>
      <TransactionsTable
        items={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        filterState={filterState}
        grouped={false}
        pageHref={(p) =>
          `/imports/transactions?status=${status}${p > 1 ? `&page=${p}` : ""}`
        }
      />
    </div>
  );
}
