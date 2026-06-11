import type { TransactionStatus, TransactionType } from "@/types/database";
import type { TransactionListItem } from "@/lib/queries/transactions";
import {
  formatPendingAccountLabel,
  hintFromImportRaw,
} from "@/lib/import/parse-raw-row";

export interface EntryRow {
  amount: number;
  amount_pln: number;
  currency: string;
  exchange_rate: number;
  account_id: string;
  sort_order?: number;
  accounts: { name: string } | null;
}

export function parseEntryDetails(entries: EntryRow[]) {
  if (!entries.length) {
    return {
      sourceAccount: null as string | null,
      targetAccount: null as string | null,
      originalAmount: null as number | null,
      currency: null as string | null,
      exchangeRate: null as number | null,
      amountPln: null as number | null,
      accountLabel: "—",
    };
  }

  const sorted = [...entries].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const source = sorted.find((e) => Number(e.amount_pln) < 0);
  const target = sorted.find((e) => Number(e.amount_pln) > 0);
  const primary = source ?? target ?? sorted[0];

  const amountPln =
    source && target
      ? Math.abs(Number(source.amount_pln))
      : Number(primary.amount_pln);

  const accountLabel =
    source && target
      ? `${source.accounts?.name ?? "?"} → ${target.accounts?.name ?? "?"}`
      : (primary.accounts?.name ?? "—");

  return {
    sourceAccount: source?.accounts?.name ?? null,
    targetAccount: target?.accounts?.name ?? null,
    originalAmount: Math.abs(Number(primary.amount)),
    currency: primary.currency,
    exchangeRate: Number(primary.exchange_rate),
    amountPln,
    accountLabel,
  };
}

export function mapTransactionRow(
  tx: {
    id: string;
    date: string;
    type: string;
    status: string;
    details: string | null;
    import_id: string | null;
    categories: { name: string } | null;
    subcategories: { name: string } | null;
    transaction_entries: EntryRow[];
  },
  hint?: ReturnType<typeof hintFromImportRaw>
): TransactionListItem {
  const entries = tx.transaction_entries ?? [];
  const parsed = parseEntryDetails(entries);
  const cat = tx.categories;
  const sub = tx.subcategories;

  return {
    id: tx.id,
    date: tx.date,
    type: tx.type as TransactionType,
    status: tx.status as TransactionStatus,
    category: cat?.name ?? null,
    subcategory: sub?.name ?? null,
    details: tx.details,
    amountPln: parsed.amountPln,
    accountLabel: parsed.accountLabel,
    sourceAccount: parsed.sourceAccount,
    targetAccount: parsed.targetAccount,
    originalAmount: parsed.originalAmount,
    currency: parsed.currency,
    exchangeRate: parsed.exchangeRate,
    importId: tx.import_id,
    pendingAmountPln: hint?.amountPln ?? null,
    pendingAmount: hint?.amount ?? null,
    pendingCurrency: hint?.currency ?? null,
    pendingExchangeRate: hint?.exchangeRate ?? null,
    pendingSourceAccount: hint?.sourceAccount || null,
    pendingTargetAccount: hint?.targetAccount || null,
    pendingAccountLabel: hint ? formatPendingAccountLabel(tx.type, hint) : null,
    reviewMessage: hint?.reviewMessage ?? null,
  };
}
