import type { BalanceMode } from "@/lib/supabase/rpc";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeCurrency } from "@/lib/fx/convert";
import { fetchValuationRatesMap } from "@/lib/fx/store-rates";
import { valuateNativeToPln } from "@/lib/fx/valuation";

interface LedgerRow {
  account_id: string;
  amount: number;
  accounts: { default_currency: string } | null;
  transactions: {
    date: string;
    deleted_at: string | null;
    is_opening_balance: boolean;
  };
}

export interface AccountLedgerBalances {
  native: Map<string, number>;
  /** Wartość w PLN po dzisiejszym kursie NBP / ręcznym (nie kursie transakcji). */
  pln: Map<string, number>;
}

export async function fetchAccountLedgerBalances(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  analysisStart: string | null,
  mode: BalanceMode
): Promise<AccountLedgerBalances> {
  const { data, error } = await supabase
    .from("transaction_entries")
    .select(
      "account_id, amount, accounts(default_currency), transactions!inner(date, deleted_at, is_opening_balance)"
    )
    .is("transactions.deleted_at", null)
    .lte("transactions.date", asOfDate);

  if (error) throw error;

  const useCurrent =
    mode === "current" || (mode !== "full" && analysisStart != null);

  const native = new Map<string, number>();
  const currencyByAccount = new Map<string, string>();

  for (const row of (data ?? []) as LedgerRow[]) {
    const tx = row.transactions;
    if (useCurrent && analysisStart) {
      const inWindow =
        tx.date > analysisStart ||
        (tx.is_opening_balance && tx.date === analysisStart);
      if (!inWindow) continue;
    }

    const id = row.account_id;
    const amount = Number(row.amount);
    const acctCur = row.accounts?.default_currency ?? "PLN";

    native.set(id, (native.get(id) ?? 0) + amount);
    currencyByAccount.set(id, acctCur);
  }

  const foreignCurrencies = [
    ...new Set(
      [...currencyByAccount.values()]
        .map((c) => normalizeCurrency(c))
        .filter((c) => c !== "PLN")
    ),
  ];

  const valuationRates = await fetchValuationRatesMap(
    supabase,
    asOfDate,
    foreignCurrencies
  );

  const pln = new Map<string, number>();
  for (const [id, acctCur] of currencyByAccount) {
    const cur = normalizeCurrency(acctCur);
    const nativeBal = native.get(id) ?? 0;
    if (cur === "PLN") {
      pln.set(id, nativeBal);
      continue;
    }
    const rate = valuationRates.get(cur);
    pln.set(
      id,
      rate != null ? valuateNativeToPln(nativeBal, cur, rate) : nativeBal
    );
  }

  return { native, pln };
}
