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
  type BalanceMode,
} from "@/lib/supabase/rpc";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { fetchTotalNetWorth } from "@/lib/queries/net-worth";
import { sortByNamePl } from "@/lib/locale-sort";
import { isAssetLedgerAccount } from "@/lib/accounts/classification";
import { parseAccountMetadata } from "@/lib/accounts/account-metadata";
import { fetchAccountLedgerBalances } from "@/lib/queries/account-ledger-balances";
import { fetchAccountPhotoUrls } from "@/lib/queries/account-photos";
import { normalizeCurrency } from "@/lib/fx/convert";

export interface AccountRow extends AccountBalance {
  balance: number;
  balance_native: number;
  has_card_photo?: boolean;
  photo_url?: string | null;
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
  "credit_card",
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
  credit_card: "Karta kredytowa",
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

  const [balances, netWorth, ledgerBalances] = await Promise.all([
    rpcAccountBalances(supabase, asOfDate, mode),
    fetchTotalNetWorth(supabase, asOfDate, mode),
    fetchAccountLedgerBalances(
      supabase,
      asOfDate,
      settings?.analysis_start_date ?? null,
      mode
    ),
  ]);

  const filtered = balances.filter((a) => !isAssetLedgerAccount(a.account_name));
  const accountIds = filtered.map((a) => a.account_id);
  const photoFlags = await fetchAccountCardPhotoFlags(supabase, accountIds);
  const photoUrls = await fetchAccountPhotoUrls(
    supabase,
    accountIds.filter((id) => photoFlags.get(id))
  ).catch(() => new Map<string, string>());
  const photoByAccount = photoFlags;

  const accounts: AccountRow[] = sortByNamePl(
    filtered.map((a) => {
      const native =
        ledgerBalances.native.get(a.account_id) ?? Number(a.balance_pln);
      const pln =
        ledgerBalances.pln.get(a.account_id) ?? Number(a.balance_pln);
      return {
        ...a,
        balance: pln,
        balance_native:
          normalizeCurrency(a.currency) === "PLN" ? pln : native,
        has_card_photo: photoByAccount.get(a.account_id) ?? false,
        photo_url: photoUrls.get(a.account_id) ?? null,
      };
    }),
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

async function fetchAccountCardPhotoFlags(
  supabase: ServerSupabaseClient,
  accountIds: string[]
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (accountIds.length === 0) return map;

  const withMeta = await supabase.from("accounts").select("id, metadata").in("id", accountIds);

  if (withMeta.error && /metadata/i.test(withMeta.error.message ?? "")) {
    return map;
  }
  if (withMeta.error) throw withMeta.error;

  const rows = (withMeta.data ?? []) as { id: string; metadata: Record<string, unknown> | null }[];
  for (const row of rows) {
    const meta = parseAccountMetadata(row.metadata);
    map.set(row.id, Boolean(meta.card_photo_storage_path));
  }
  return map;
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

  const [rows, needsReviewCount, ledgerBalances] = await Promise.all([
    rpcAllAccountBalances(supabase, asOfDate, mode),
    rpcAccountsNeedsReviewCount(supabase),
    fetchAccountLedgerBalances(
      supabase,
      asOfDate,
      settings?.analysis_start_date ?? null,
      mode
    ),
  ]);

  const accounts = sortByNamePl(
    rows.map((a) => {
      const native =
        ledgerBalances.native.get(a.account_id) ?? Number(a.balance_pln);
      const pln =
        ledgerBalances.pln.get(a.account_id) ?? Number(a.balance_pln);
      return {
        ...a,
        balance: pln,
        balance_native:
          normalizeCurrency(a.currency) === "PLN" ? pln : native,
        opening_balance_pln: a.opening_balance_pln != null ? Number(a.opening_balance_pln) : null,
        has_opening_balance: Boolean(a.has_opening_balance),
        history_balance_pln: Number(a.history_balance_pln ?? a.balance_pln),
      };
    }),
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

const ACCOUNT_DETAIL_COLUMNS =
  "id, user_id, name, account_number, account_type, default_currency, is_active, lifecycle_status, show_on_dashboard, include_in_net_worth, needs_review, imported_at, notes, created_at, updated_at, deleted_at";

const ACCOUNT_DETAIL_COLUMNS_WITH_METADATA = `${ACCOUNT_DETAIL_COLUMNS}, metadata`;

export async function fetchAccountDetail(
  supabase: ServerSupabaseClient,
  accountId: string
): Promise<Account | null> {
  let data: Record<string, unknown> | null = null;
  let error: { message?: string; code?: string } | null = null;

  const withMeta = await supabase
    .from("accounts")
    .select(ACCOUNT_DETAIL_COLUMNS_WITH_METADATA)
    .eq("id", accountId)
    .is("deleted_at", null)
    .maybeSingle();

  data = withMeta.data as Record<string, unknown> | null;
  error = withMeta.error;

  if (error && /metadata/i.test(error.message ?? "")) {
    const fallback = await supabase
      .from("accounts")
      .select(ACCOUNT_DETAIL_COLUMNS)
      .eq("id", accountId)
      .is("deleted_at", null)
      .maybeSingle();
    data = fallback.data as Record<string, unknown> | null;
    error = fallback.error;
  }

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as Account & { metadata?: Record<string, unknown> };
  return { ...row, metadata: row.metadata ?? {} };
}
