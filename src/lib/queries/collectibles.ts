import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { InstrumentRow } from "@/lib/queries/instruments";
import { fetchInstrumentsPortfolio } from "@/lib/queries/instruments";
import {
  collectibleDisplayValue,
  parseCollectibleMetadata,
  type CollectibleMetadata,
} from "@/lib/collectibles/collectible-metadata";

export interface CollectibleItem extends InstrumentRow {
  collectible: CollectibleMetadata;
  display_value_pln: number;
}

export interface CollectiblesInventoryData {
  items: CollectibleItem[];
  totalInvested: number;
  totalDisplayValue: number;
}

export async function fetchCollectiblesInventory(
  supabase: ServerSupabaseClient
): Promise<CollectiblesInventoryData> {
  const portfolio = await fetchInstrumentsPortfolio(supabase);
  const items: CollectibleItem[] = [];

  for (const inst of portfolio) {
    const { data: row } = await supabase
      .from("instruments")
      .select("metadata, instrument_type")
      .eq("id", inst.id)
      .maybeSingle();

    const rowData = row as { metadata?: Record<string, unknown>; instrument_type?: string } | null;
    const type = rowData?.instrument_type ?? inst.instrument_type;
    const metaRaw = rowData?.metadata ?? {};
    const isCollectible = type === "COLLECTIBLE" || metaRaw.collectible_kind === "lego";
    if (!isCollectible) continue;

    const meta =
      parseCollectibleMetadata(metaRaw) ??
      ({
        purchase_price_pln: inst.invested_pln,
        purchase_date: "",
        payment_account_id: "",
        payment_account_name: inst.account_name ?? "",
      } as CollectibleMetadata);

    items.push({
      ...inst,
      collectible: meta,
      display_value_pln: collectibleDisplayValue(meta) || inst.market_value_pln,
    });
  }

  const totalInvested = items.reduce((s, i) => s + i.invested_pln, 0);
  const totalDisplayValue = items.reduce((s, i) => s + i.display_value_pln, 0);

  return { items, totalInvested, totalDisplayValue };
}
