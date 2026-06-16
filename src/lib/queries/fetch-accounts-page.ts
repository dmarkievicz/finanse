import type { AccountManageRow } from "@/types/database";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { fetchAccountsManage } from "@/lib/queries/accounts";
import {
  fetchInstrumentsMarketValue,
} from "@/lib/queries/net-worth";
import { fetchPortfoliosMarketValue } from "@/lib/queries/investment-portfolios";
import { isAssetLedgerAccount } from "@/lib/accounts/classification";
import { parseAccountMetadata } from "@/lib/accounts/account-metadata";
import { fetchAccountPhotoUrls } from "@/lib/queries/account-photos";
import { sortByNamePl } from "@/lib/locale-sort";

export interface AccountsPageAccount extends AccountManageRow {
  has_card_photo: boolean;
  photo_url: string | null;
}

export interface AccountsPageData {
  accounts: AccountsPageAccount[];
  netWorth: number;
  asOfDate: string;
}

export async function fetchAccountsPageData(
  supabase: ServerSupabaseClient,
  asOfDate = new Date().toISOString().slice(0, 10)
): Promise<AccountsPageData> {
  const [manage, instruments, portfolios] = await Promise.all([
    fetchAccountsManage(supabase, asOfDate),
    fetchInstrumentsMarketValue(supabase),
    fetchPortfoliosMarketValue(supabase),
  ]);

  const filtered = manage.accounts.filter((a) => !isAssetLedgerAccount(a.account_name));
  const accountIds = filtered.map((a) => a.account_id);
  const photoFlags = await fetchAccountCardPhotoFlags(supabase, accountIds);
  const photoUrls = await fetchAccountPhotoUrls(
    supabase,
    accountIds.filter((id) => photoFlags.get(id))
  ).catch(() => new Map<string, string>());

  const accounts: AccountsPageAccount[] = sortByNamePl(
    filtered.map((a) => ({
      ...a,
      has_card_photo: photoFlags.get(a.account_id) ?? false,
      photo_url: photoUrls.get(a.account_id) ?? null,
    })),
    (a) => a.account_name
  );

  const accountsNet = accounts
    .filter((a) => a.include_in_net_worth)
    .reduce((sum, a) => sum + a.balance, 0);
  const netWorth = accountsNet + instruments + portfolios;

  return { accounts, netWorth, asOfDate: manage.asOfDate };
}

async function fetchAccountCardPhotoFlags(
  supabase: ServerSupabaseClient,
  accountIds: string[]
): Promise<Map<string, boolean>> {
  const map = new Map<string, boolean>();
  if (accountIds.length === 0) return map;

  const { data, error } = await supabase
    .from("accounts")
    .select("id, metadata")
    .in("id", accountIds);

  if (error && !/metadata/i.test(error.message ?? "")) throw error;
  if (error) return map;

  for (const row of data ?? []) {
    const meta = parseAccountMetadata(
      (row as { metadata: Record<string, unknown> | null }).metadata
    );
    map.set((row as { id: string }).id, Boolean(meta.card_photo_storage_path));
  }
  return map;
}
