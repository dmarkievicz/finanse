import type {
  Account,
  AccountBalance,
  AccountManageRow,
  AccountType,
} from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  rpcAccountBalances,
  rpcAllAccountBalances,
  rpcAccountsNeedsReviewCount,
  rpcNetWorth,
  type BalanceMode,
} from "@/lib/supabase/rpc";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { sortByNamePl } from "@/lib/locale-sort";

export interface AccountRow extends AccountBalance {
  balance: number;
}

export interface AccountsPageData {
  accounts: AccountRow[];
  netWorth: number;
  asOfDate: string;
  byType: Record<AccountType, AccountRow[]>;
}

export const ACCOUNT_TYPE_ORDER: AccountType[] = [
  "bank",
  "cash",
  "broker",
  "deposit",
  "investment",
  "loan",
  "real_estate",
  "other",
];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  bank: "Bank",
  cash: "Gotówka",
  broker: "Broker",
  deposit: "Lokata",
  investment: "Inwestycja",
  loan: "Pożyczka / kredyt",
  real_estate: "Nieruchomość",
  other: "Inne",
};

export async function fetchAccounts(
  supabase: ServerSupabaseClient,
  asOfDate = new Date().toISOString().slice(0, 10)
): Promise<AccountsPageData> {
  const settings = await fetchUserSettings(supabase);
  const mode: BalanceMode = balanceMode(settings);

  const [balances, netWorth] = await Promise.all([
    rpcAccountBalances(supabase, asOfDate, mode),
    rpcNetWorth(supabase, asOfDate, mode),
  ]);

  const accounts: AccountRow[] = sortByNamePl(
    balances.map((a) => ({
      ...a,
      balance: Number(a.balance_pln),
    })),
    (a) => a.account_name
  );

  const byType = ACCOUNT_TYPE_ORDER.reduce(
    (acc, type) => {
      acc[type] = sortByNamePl(
        accounts.filter((a) => a.account_type === type),
        (a) => a.account_name
      );
      return acc;
    },
    {} as Record<AccountType, AccountRow[]>
  );

  return { accounts, netWorth, asOfDate, byType };
}

export interface AccountsManagePageData {
  accounts: AccountManageRow[];
  needsReviewCount: number;
  asOfDate: string;
  activeCount: number;
  archivedCount: number;
  analysisStartDate: string | null;
}

export async function fetchAccountsManage(
  supabase: ServerSupabaseClient,
  asOfDate = new Date().toISOString().slice(0, 10)
): Promise<AccountsManagePageData> {
  const settings = await fetchUserSettings(supabase);
  const mode: BalanceMode = balanceMode(settings);

  const [rows, needsReviewCount] = await Promise.all([
    rpcAllAccountBalances(supabase, asOfDate, mode),
    rpcAccountsNeedsReviewCount(supabase),
  ]);

  const accounts = sortByNamePl(
    rows.map((a) => ({
      ...a,
      balance: Number(a.balance_pln),
      opening_balance_pln: a.opening_balance_pln != null ? Number(a.opening_balance_pln) : null,
      has_opening_balance: Boolean(a.has_opening_balance),
      history_balance_pln: Number(a.history_balance_pln ?? a.balance_pln),
    })),
    (a) => a.account_name
  );

  return {
    accounts,
    needsReviewCount,
    asOfDate,
    activeCount: accounts.filter((a) => a.lifecycle_status === "active").length,
    archivedCount: accounts.filter((a) => a.lifecycle_status === "archived").length,
    analysisStartDate: settings?.analysis_start_date ?? null,
  };
}

export async function fetchAccountName(
  supabase: ServerSupabaseClient,
  accountId: string
): Promise<string | null> {
  const account = await fetchAccountDetail(supabase, accountId);
  return account?.name ?? null;
}

export async function fetchAccountDetail(
  supabase: ServerSupabaseClient,
  accountId: string
): Promise<Account | null> {
  const { data, error } = await supabase
    .from("accounts")
    .select(
      "id, user_id, name, account_number, account_type, default_currency, is_active, lifecycle_status, show_on_dashboard, include_in_net_worth, needs_review, imported_at, notes, created_at, updated_at, deleted_at"
    )
    .eq("id", accountId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return (data as Account | null) ?? null;
}
