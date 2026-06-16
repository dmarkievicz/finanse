import type { BalanceMode } from "@/lib/supabase/rpc";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  ledgerEntryPln,
  reconcileForeignBalancePln,
} from "@/lib/balances/resolve-entry-pln";
import { normalizeCurrency } from "@/lib/fx/convert";
import { lookupExchangeRate } from "@/lib/fx/store-rates";

interface LedgerRow {
  account_id: string;
  amount: number;
  amount_pln: number;
  currency: string;
  exchange_rate: number;
  accounts: { default_currency: string } | null;
  transactions: {
    date: string;
    deleted_at: string | null;
    is_opening_balance: boolean;
  };
}

interface AccountLedgerMeta {
  currency: string;
  rates: { rate: number; date: string }[];
}

export interface AccountLedgerBalances {
  native: Map<string, number>;
  pln: Map<string, number>;
}

const FX_FALLBACK = ["EUR", "USD"] as const;

export async function fetchAccountLedgerBalances(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  analysisStart: string | null,
  mode: BalanceMode
): Promise<AccountLedgerBalances> {
  const { data, error } = await supabase
    .from("transaction_entries")
    .select(
      "account_id, amount, amount_pln, currency, exchange_rate, accounts(default_currency), transactions!inner(date, deleted_at, is_opening_balance)"
    )
    .is("transactions.deleted_at", null)
    .lte("transactions.date", asOfDate);

  if (error) throw error;

  const useCurrent =
    mode === "current" || (mode !== "full" && analysisStart != null);

  const native = new Map<string, number>();
  const pln = new Map<string, number>();
  const meta = new Map<string, AccountLedgerMeta>();

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
    const rate = Number(row.exchange_rate);
    const acctCur = row.accounts?.default_currency ?? row.currency;

    native.set(id, (native.get(id) ?? 0) + amount);

    const plnDelta = ledgerEntryPln({
      amount,
      amount_pln: Number(row.amount_pln),
      currency: row.currency,
      exchange_rate: rate,
      accountCurrency: acctCur,
    });
    pln.set(id, (pln.get(id) ?? 0) + plnDelta);

    const m = meta.get(id) ?? { currency: acctCur, rates: [] };
    m.currency = acctCur;
    if (rate > 0 && rate !== 1) {
      m.rates.push({ rate, date: tx.date });
    }
    meta.set(id, m);
  }

  const nbpRates = new Map<string, number>();
  await Promise.all(
    FX_FALLBACK.map(async (code) => {
      const found = await lookupExchangeRate(supabase, code, asOfDate);
      if (found) nbpRates.set(code, found.rate);
    })
  );

  for (const [id, m] of meta) {
    const cur = normalizeCurrency(m.currency);
    if (cur === "PLN") continue;

    const nativeBal = native.get(id) ?? 0;
    const plnBal = pln.get(id) ?? 0;
    const rates = m.rates
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((r) => r.rate);

    pln.set(
      id,
      reconcileForeignBalancePln(
        nativeBal,
        plnBal,
        cur,
        rates,
        nbpRates.get(cur) ?? null
      )
    );
  }

  return { native, pln };
}
