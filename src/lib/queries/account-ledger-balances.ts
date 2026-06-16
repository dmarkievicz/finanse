import type { BalanceMode } from "@/lib/supabase/rpc";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { shouldIncludeInBalance } from "@/lib/balances/compute";
import { ledgerEntryNative } from "@/lib/balances/resolve-entry-pln";
import { normalizeCurrency } from "@/lib/fx/convert";

const LEDGER_PAGE_SIZE = 1000;

const LEDGER_SELECT =
  "account_id, amount, amount_pln, currency, exchange_rate, accounts(default_currency), transactions!inner(date, deleted_at, is_opening_balance)";

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

export interface AccountLedgerBalances {
  native: Map<string, number>;
}

// Supabase query builder — łańcuch filtrów bez sztywnego typu generyka.
type LedgerQuery = {
  is: (col: string, val: null) => LedgerQuery;
  lte: (col: string, val: string) => LedgerQuery;
  eq: (col: string, val: string | boolean) => LedgerQuery;
  gt: (col: string, val: string) => LedgerQuery;
  range: (from: number, to: number) => Promise<{ data: LedgerRow[] | null; error: Error | null }>;
};

async function fetchAccountCurrencyMap(
  supabase: ServerSupabaseClient
): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, default_currency")
    .is("deleted_at", null);

  if (error) throw error;

  const rows = (data ?? []) as { id: string; default_currency: string }[];
  return new Map(rows.map((row) => [row.id, row.default_currency]));
}

function ledgerBaseQuery(
  supabase: ServerSupabaseClient,
  asOfDate: string
): LedgerQuery {
  return supabase
    .from("transaction_entries")
    .select(LEDGER_SELECT)
    .is("transactions.deleted_at", null)
    .lte("transactions.date", asOfDate) as unknown as LedgerQuery;
}

async function fetchLedgerPage(
  query: LedgerQuery,
  offset: number
): Promise<LedgerRow[]> {
  const { data, error } = await query.range(offset, offset + LEDGER_PAGE_SIZE - 1);
  if (error) throw error;
  return (data ?? []) as LedgerRow[];
}

async function fetchLedgerRows(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  buildQuery: (base: LedgerQuery) => LedgerQuery
): Promise<LedgerRow[]> {
  const rows: LedgerRow[] = [];
  let offset = 0;

  while (true) {
    const page = await fetchLedgerPage(buildQuery(ledgerBaseQuery(supabase, asOfDate)), offset);
    if (!page.length) break;
    rows.push(...page);
    if (page.length < LEDGER_PAGE_SIZE) break;
    offset += LEDGER_PAGE_SIZE;
  }

  return rows;
}

/**
 * Tryb current: saldo otwarcia (dzień startu) + transakcje po dacie startu — jak compute_account_balances w SQL.
 * Tryb full: cała historia do as_of.
 */
async function fetchLedgerRowsForMode(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  analysisStart: string | null,
  mode: BalanceMode
): Promise<LedgerRow[]> {
  const useCurrent =
    mode === "current" || (mode !== "full" && analysisStart != null);

  if (!useCurrent || !analysisStart) {
    return fetchLedgerRows(supabase, asOfDate, (q) => q);
  }

  const [openingRows, afterStartRows] = await Promise.all([
    fetchLedgerRows(supabase, asOfDate, (q) =>
      q
        .eq("transactions.date", analysisStart)
        .eq("transactions.is_opening_balance", true)
    ),
    fetchLedgerRows(supabase, asOfDate, (q) => q.gt("transactions.date", analysisStart)),
  ]);

  return [...openingRows, ...afterStartRows];
}

export async function fetchAccountLedgerBalances(
  supabase: ServerSupabaseClient,
  asOfDate: string,
  analysisStart: string | null,
  mode: BalanceMode
): Promise<AccountLedgerBalances> {
  const [rows, accountCurrencies] = await Promise.all([
    fetchLedgerRowsForMode(supabase, asOfDate, analysisStart, mode),
    fetchAccountCurrencyMap(supabase),
  ]);

  const filterOpts = {
    asOfDate,
    mode: (mode === "full" ? "full" : "current") as BalanceMode,
    analysisStartDate: analysisStart,
  };

  const native = new Map<string, number>();

  for (const row of rows) {
    const tx = row.transactions;
    if (
      !shouldIncludeInBalance(
        {
          date: tx.date,
          status: "confirmed",
          is_opening_balance: tx.is_opening_balance,
        },
        filterOpts
      )
    ) {
      continue;
    }

    const id = row.account_id;
    const nativeAmt = ledgerEntryNative({
      amount: Number(row.amount),
      amount_pln: Number(row.amount_pln),
      currency: row.currency,
      exchange_rate: Number(row.exchange_rate),
      accountCurrency:
        row.accounts?.default_currency ?? accountCurrencies.get(id) ?? null,
    });
    native.set(id, (native.get(id) ?? 0) + nativeAmt);
  }

  return { native };
}

export function resolveAccountNativeBalance(
  accountId: string,
  currency: string,
  nativeLedger: Map<string, number>,
  rpcBalancePln: number
): number {
  if (nativeLedger.has(accountId)) {
    return nativeLedger.get(accountId)!;
  }
  if (normalizeCurrency(currency) === "PLN") return rpcBalancePln;
  return 0;
}
