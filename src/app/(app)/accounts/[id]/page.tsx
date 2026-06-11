import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { createClient } from "@/lib/supabase/server";
import { AccountEditForm } from "@/components/accounts/account-edit-form";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import { fetchAccountDetail } from "@/lib/queries/accounts";
import { fetchTransactions } from "@/lib/queries/transactions";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { rpcAllAccountBalances } from "@/lib/supabase/rpc";
import { formatPln } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

export default async function AccountDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { page: pageStr } = await searchParams;
  const page = Number(pageStr ?? "1");

  const supabase = await createClient();
  const account = await fetchAccountDetail(supabase, id);
  if (!account) notFound();
  const name = account.name;

  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);
  const today = new Date().toISOString().slice(0, 10);
  const [currentRows, fullRows] = await Promise.all([
    rpcAllAccountBalances(supabase, today, mode),
    rpcAllAccountBalances(supabase, today, "full"),
  ]);
  const accountBalance = currentRows.find((b) => b.account_id === id);
  const historyBalance = fullRows.find((b) => b.account_id === id);

  const filterState = {
    type: "all" as const,
    reviewOnly: false,
    accountId: id,
    accountName: name,
  };

  const data = await fetchTransactions(supabase, { page, accountId: id });

  return (
    <div>
      <PageHeader
        title={name}
        description={`${ACCOUNT_TYPE_LABELS[account.account_type]} · ${account.default_currency}${account.account_number ? ` · ${account.account_number}` : ""}`}
      />

      <Link
        href="/accounts"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wszystkie konta
      </Link>

      <AccountEditForm account={account} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted">Saldo bieżące</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatPln(Number(accountBalance?.balance_pln ?? 0))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted">Z pełnej historii importu</p>
          <p className="mt-1 text-2xl font-semibold text-muted">
            {formatPln(Number(historyBalance?.balance_pln ?? 0))}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted">Transakcje</p>
          <p className="mt-1 text-2xl font-semibold">{data.total.toLocaleString("pl-PL")}</p>
        </div>
      </div>

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
