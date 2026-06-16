import type { TransactionStatus, TransactionType } from "@/types/database";
import type { TransactionListItem } from "@/lib/queries/transactions";
import {
  accountCurrency,
  foreignFromPln,
  normalizeCurrency,
  plnFromForeign,
  resolveForeignNativeAmount,
  resolveSignedEntryPln,
  resolveTransferPlnAmount,
} from "@/lib/balances/resolve-entry-pln";
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
  accounts: { name: string; default_currency?: string } | null;
}

function entryInput(entry: EntryRow) {
  return {
    amount: Number(entry.amount),
    amount_pln: Number(entry.amount_pln),
    currency: entry.currency,
    exchange_rate: Number(entry.exchange_rate),
    accountCurrency: entry.accounts?.default_currency,
  };
}

function findForeignLeg(source: EntryRow, target: EntryRow): EntryRow | null {
  const srcCur = accountCurrency(source.currency, source.accounts?.default_currency);
  const tgtCur = accountCurrency(target.currency, target.accounts?.default_currency);
  if (srcCur !== "PLN") return source;
  if (tgtCur !== "PLN") return target;
  return (
    [source, target].find((e) => normalizeCurrency(e.currency) !== "PLN") ?? null
  );
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
  const source =
    sorted.find((e) => Number(e.amount) < 0) ??
    sorted.find((e) => Number(e.amount_pln) < 0);
  const target =
    sorted.find((e) => Number(e.amount) > 0) ??
    sorted.find((e) => Number(e.amount_pln) > 0);
  const primary = source ?? target ?? sorted[0];

  if (source && target) {
    const amountPln = resolveTransferPlnAmount(entryInput(source), entryInput(target));
    const foreignLeg = findForeignLeg(source, target);
    const plnLeg =
      accountCurrency(source.currency, source.accounts?.default_currency) === "PLN"
        ? source
        : accountCurrency(target.currency, target.accounts?.default_currency) === "PLN"
          ? target
          : [source, target].find((e) => normalizeCurrency(e.currency) === "PLN");

    if (foreignLeg && amountPln > 0) {
      const foreignCurrency = accountCurrency(
        foreignLeg.currency,
        foreignLeg.accounts?.default_currency
      );
      const rate =
        Number(foreignLeg.exchange_rate) ||
        Number(plnLeg?.exchange_rate) ||
        1;
      const nativeAmount = resolveForeignNativeAmount(entryInput(foreignLeg), amountPln);

      return {
        sourceAccount: source.accounts?.name ?? null,
        targetAccount: target.accounts?.name ?? null,
        originalAmount: nativeAmount,
        currency: foreignCurrency,
        exchangeRate: rate,
        amountPln,
        accountLabel: `${source.accounts?.name ?? "?"} → ${target.accounts?.name ?? "?"}`,
      };
    }

    const currency = accountCurrency(
      primary.currency,
      primary.accounts?.default_currency
    );
    const rate = Number(primary.exchange_rate) || 1;
    let originalAmount = Math.abs(Number(primary.amount));
    if (currency !== "PLN" && (originalAmount <= 0 || Math.abs(originalAmount - amountPln) < 0.01)) {
      originalAmount = foreignFromPln(amountPln, currency, rate);
    } else if (currency !== "PLN" && originalAmount > amountPln * 0.9) {
      originalAmount = foreignFromPln(amountPln, currency, rate);
    }

    return {
      sourceAccount: source.accounts?.name ?? null,
      targetAccount: target.accounts?.name ?? null,
      originalAmount,
      currency,
      exchangeRate: rate,
      amountPln,
      accountLabel: `${source.accounts?.name ?? "?"} → ${target.accounts?.name ?? "?"}`,
    };
  }

  const input = entryInput(primary);
  const signedPln = resolveSignedEntryPln(input);
  const amountPln = Math.abs(signedPln);
  const currency = accountCurrency(primary.currency, primary.accounts?.default_currency);
  const rate = Number(primary.exchange_rate) || 1;
  let originalAmount = Math.abs(Number(primary.amount));

  if (currency !== "PLN") {
    const derivedPln = plnFromForeign(originalAmount, rate);
    if (originalAmount <= 0 || Math.abs(derivedPln - amountPln) > 0.01) {
      originalAmount = foreignFromPln(amountPln, currency, rate);
    } else if (originalAmount > amountPln * 0.9) {
      originalAmount = foreignFromPln(amountPln, currency, rate);
    }
  }

  return {
    sourceAccount: source?.accounts?.name ?? null,
    targetAccount: target?.accounts?.name ?? null,
    originalAmount,
    currency,
    exchangeRate: rate,
    amountPln,
    accountLabel: primary.accounts?.name ?? "—",
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
