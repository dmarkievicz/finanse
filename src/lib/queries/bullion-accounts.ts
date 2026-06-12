import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { isGoldLedgerAccount } from "@/lib/accounts/classification";
import { sortByNamePl } from "@/lib/locale-sort";

const PAYMENT_ACCOUNT_TYPES = new Set(["bank", "cash", "broker"]);

export interface BullionPaymentAccount {
  id: string;
  name: string;
  account_type: string;
}

export async function fetchBullionPaymentAccounts(
  supabase: ServerSupabaseClient
): Promise<BullionPaymentAccount[]> {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, account_type")
    .is("deleted_at", null)
    .eq("lifecycle_status", "active")
    .order("name");

  if (error) throw error;

  return sortByNamePl(
    (data ?? [])
      .filter((a) => {
        const row = a as { name: string; account_type: string };
        return PAYMENT_ACCOUNT_TYPES.has(row.account_type) && !isGoldLedgerAccount(row.name);
      })
      .map((a) => {
        const row = a as { id: string; name: string; account_type: string };
        return { id: row.id, name: row.name, account_type: row.account_type };
      }),
    (a) => a.name
  );
}
