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

function normalizeCurrency(currency: string | null | undefined): string {
  if (!currency) return "PLN";
  const c = currency.trim().toUpperCase();
  if (c === "EURO") return "EUR";
  return c;
}

function plnEquivalent(amount: number, currency: string, rate: number): number {
  const cur = normalizeCurrency(currency);
  const abs = Math.abs(amount);
  if (cur === "PLN") return abs;
  return Math.round(abs * (rate > 0 ? rate : 1) * 100) / 100;
}

function foreignFromPln(pln: number, currency: string, rate: number): number {
  const cur = normalizeCurrency(currency);
  if (cur === "PLN") return pln;
  const r = rate > 0 ? rate : 1;
  return Math.round((pln / r) * 100) / 100;
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
    const amountPln = Math.max(
      Math.abs(Number(source.amount_pln)),
      Math.abs(Number(target.amount_pln))
    );
    const foreignLeg = [source, target].find((e) => normalizeCurrency(e.currency) !== "PLN");
    const plnLeg = [source, target].find((e) => normalizeCurrency(e.currency) === "PLN");

    if (foreignLeg && plnLeg && amountPln > 0) {
      const foreignCurrency = normalizeCurrency(foreignLeg.currency);
      const rate = Number(foreignLeg.exchange_rate) || Number(plnLeg.exchange_rate) || 1;
      let nativeAmount = Math.abs(Number(foreignLeg.amount));
      if (nativeAmount <= 0 || Math.abs(nativeAmount - amountPln) < 0.01) {
        nativeAmount = foreignFromPln(amountPln, foreignCurrency, rate);
      }

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

    const currency = normalizeCurrency(primary.currency);
    const rate = Number(primary.exchange_rate) || 1;
    let originalAmount = Math.abs(Number(primary.amount));
    if (currency !== "PLN" && (originalAmount <= 0 || Math.abs(originalAmount - amountPln) < 0.01)) {
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

  const amountPln = Math.abs(Number(primary.amount_pln));
  const currency = normalizeCurrency(primary.currency);
  const rate = Number(primary.exchange_rate) || 1;
  let originalAmount = Math.abs(Number(primary.amount));
  if (currency !== "PLN") {
    const derivedPln = plnEquivalent(originalAmount, currency, rate);
    if (originalAmount <= 0 || Math.abs(derivedPln - amountPln) > 0.01) {
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
