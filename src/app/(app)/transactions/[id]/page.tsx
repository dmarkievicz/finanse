import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { TransactionEditForm } from "@/components/transactions/transaction-edit-form";
import { TransactionEntriesEditor } from "@/components/transactions/transaction-entries-editor";
import { ReviewEntryPanel } from "@/components/transactions/review-entry-panel";
import type { TransactionListItem } from "@/lib/queries/transactions";
import { hintFromImportRaw, formatPendingAccountLabel } from "@/lib/import/parse-raw-row";
import { createClient } from "@/lib/supabase/server";
import { fetchTransactionDetail, fetchLookupData } from "@/lib/queries/transaction-detail";
import { fetchAuditForTransaction } from "@/lib/queries/audit";
import { AuditHistory } from "@/components/audit/audit-history";
import { formatDate, formatPlnSigned } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const transaction = await fetchTransactionDetail(supabase, id);
  if (!transaction) notFound();

  const lookup = await fetchLookupData(supabase);
  const entryAccounts = lookup.accounts;

  const auditRows = await fetchAuditForTransaction(
    supabase,
    id,
    transaction.entries.map((e) => e.id)
  );

  const hint = transaction.import_raw
    ? hintFromImportRaw(transaction.import_raw, transaction.import_validation_errors)
    : null;
  const reviewListItem: TransactionListItem | null =
    transaction.status === "needs_review" && transaction.entries.length === 0
      ? {
          id: transaction.id,
          date: transaction.date,
          type: transaction.type,
          status: transaction.status,
          category: transaction.category_name,
          subcategory: transaction.subcategory_name,
          details: transaction.details,
          amountPln: null,
          accountLabel: hint ? formatPendingAccountLabel(transaction.type, hint) : "—",
          pendingAmountPln: hint?.amountPln ?? null,
          pendingAmount: hint?.amount ?? null,
          pendingCurrency: hint?.currency ?? null,
          pendingExchangeRate: hint?.exchangeRate ?? null,
          pendingSourceAccount: hint?.sourceAccount || null,
          pendingTargetAccount: hint?.targetAccount || null,
          pendingAccountLabel: hint ? formatPendingAccountLabel(transaction.type, hint) : null,
          reviewMessage: hint?.reviewMessage ?? null,
        }
      : null;

  return (
    <div>
      <PageHeader
        title="Szczegóły transakcji"
        description={`${formatDate(transaction.date)} · ${transaction.type}`}
      />

      <Link
        href="/transactions"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do listy
      </Link>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-medium text-muted">Wpisy księgowe</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {transaction.entries.map((e) => (
              <li key={e.id} className="flex justify-between">
                <span>
                  {e.account_name} ({e.currency})
                </span>
                <span className="font-medium">{formatPlnSigned(e.amount_pln)}</span>
              </li>
            ))}
          </ul>
          {transaction.is_opening_balance && (
            <p className="mt-3 text-xs text-amber-700">Saldo otwarcia / korekta</p>
          )}
        </div>

        {transaction.import_raw && (
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-medium text-muted">Oryginalny wiersz importu</h3>
            <pre className="mt-2 max-h-48 overflow-auto text-xs text-muted">
              {JSON.stringify(transaction.import_raw, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {reviewListItem ? (
        <ReviewEntryPanel item={reviewListItem} accounts={entryAccounts} />
      ) : (
        <TransactionEntriesEditor transaction={transaction} accounts={entryAccounts} />
      )}
      <div className="mt-6">
        <TransactionEditForm transaction={transaction} categories={lookup.categories} />
      </div>

      <div className="mt-6">
        <AuditHistory rows={auditRows} />
      </div>
    </div>
  );
}
