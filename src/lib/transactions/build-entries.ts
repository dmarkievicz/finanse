import type { TransactionType } from "@/types/database";
import { signedAmountPln } from "@/lib/balances/invariants";

export interface EntryCreatePayload {
  account_id: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  amount_pln: number;
  sort_order: number;
}

export interface BuildEntriesInput {
  type: TransactionType;
  amount: number;
  currency: string;
  exchangeRate: number;
  sourceAccountId?: string;
  targetAccountId?: string;
}

export function buildEntriesForTransaction(
  input: BuildEntriesInput
): EntryCreatePayload[] {
  const amount = input.amount;
  if (amount == null || Number.isNaN(amount) || amount === 0) {
    throw new Error("Podaj poprawną kwotę");
  }

  const rate = input.exchangeRate || 1;
  const { currency } = input;

  switch (input.type) {
    case "income": {
      if (!input.targetAccountId) throw new Error("Wybierz konto docelowe");
      const amount_pln = signedAmountPln(amount, rate);
      return [
        {
          account_id: input.targetAccountId,
          amount,
          currency,
          exchange_rate: rate,
          amount_pln,
          sort_order: 0,
        },
      ];
    }
    case "expense": {
      if (!input.sourceAccountId) throw new Error("Wybierz konto źródłowe");
      const amount_pln = signedAmountPln(amount, rate);
      return [
        {
          account_id: input.sourceAccountId,
          amount: -amount,
          currency,
          exchange_rate: rate,
          amount_pln: -amount_pln,
          sort_order: 0,
        },
      ];
    }
    case "adjustment": {
      const accountId = input.targetAccountId || input.sourceAccountId;
      if (!accountId) throw new Error("Wybierz konto");
      return [
        {
          account_id: accountId,
          amount,
          currency,
          exchange_rate: rate,
          amount_pln: signedAmountPln(amount, rate),
          sort_order: 0,
        },
      ];
    }
    case "transfer":
    case "exchange": {
      if (!input.sourceAccountId || !input.targetAccountId) {
        throw new Error("Transfer wymaga konta źródłowego i docelowego");
      }
      const abs = Math.abs(amount);
      const pln = Math.round(abs * rate * 100) / 100;
      return [
        {
          account_id: input.sourceAccountId,
          amount: -abs,
          currency,
          exchange_rate: rate,
          amount_pln: -pln,
          sort_order: 0,
        },
        {
          account_id: input.targetAccountId,
          amount: abs,
          currency,
          exchange_rate: rate,
          amount_pln: pln,
          sort_order: 1,
        },
      ];
    }
    default:
      throw new Error("Nieobsługiwany typ transakcji");
  }
}

export function validateEntriesBalanced(
  type: TransactionType,
  entries: EntryCreatePayload[]
): void {
  if (!["transfer", "exchange"].includes(type)) return;
  const sum = entries.reduce((s, e) => s + e.amount_pln, 0);
  if (Math.abs(sum) > 0.05) {
    throw new Error(`Transfer niezbilansowany (różnica ${sum.toFixed(2)} PLN)`);
  }
}

export function previewEntryPln(amount: number, rate: number): number {
  return signedAmountPln(amount, rate);
}
