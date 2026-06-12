import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  fineGoldGrams,
  parseGoldBullionMetadata,
  premiumOverSpotPercent,
  type GoldBullionMetadata,
} from "@/lib/gold/bullion-metadata";
import type { InstrumentRow } from "@/lib/queries/instruments";
import { fetchInstrumentsPortfolio } from "@/lib/queries/instruments";

export interface BullionItem extends InstrumentRow {
  bullion: GoldBullionMetadata;
  fine_grams: number;
  purchase_price_pln: number;
  spot_value_pln: number | null;
  spot_pnl_pln: number | null;
  premium_pct: number | null;
  payment_account_name: string | null;
}

export interface BullionInventoryData {
  items: BullionItem[];
  totalInvested: number;
  totalSpotValue: number | null;
  totalSpotPnl: number | null;
  totalFineGrams: number;
  spotPricePlnPerGram: number | null;
  spotSource: string | null;
  spotFetchedAt: string | null;
}

export async function fetchBullionInventory(
  supabase: ServerSupabaseClient,
  spot?: { pricePlnPerGram: number; source: string; fetchedAt: string } | null
): Promise<BullionInventoryData> {
  const portfolio = await fetchInstrumentsPortfolio(supabase);
  const goldItems = portfolio.filter((i) => i.instrument_type === "GOLD");

  const goldIds = goldItems.map((i) => i.id);
  const { data: metaRows } =
    goldIds.length > 0
      ? await supabase
          .from("instruments")
          .select("id, metadata")
          .in("id", goldIds)
          .is("deleted_at", null)
      : { data: [] };

  const metaById = new Map(
    (metaRows ?? []).map((r) => [
      (r as { id: string }).id,
      (r as { metadata: Record<string, unknown> }).metadata ?? {},
    ])
  );

  const items: BullionItem[] = [];
  let totalInvested = 0;
  let totalSpotValue = 0;
  let hasSpot = false;
  let totalFineGrams = 0;

  for (const inst of goldItems) {
    const rawMeta = metaById.get(inst.id) ?? {};
    const bullion =
      parseGoldBullionMetadata(rawMeta) ??
      ({
        weight_grams: inst.quantity > 0 ? inst.quantity : 1,
        purchase_price_pln: inst.invested_pln,
      } as GoldBullionMetadata);

    const fine = fineGoldGrams(bullion);
    const purchase = bullion.purchase_price_pln ?? inst.invested_pln;
    const spotValue =
      spot && fine > 0 ? fine * spot.pricePlnPerGram : inst.last_price != null ? inst.market_value_pln : null;
    const spotPnl = spotValue != null ? spotValue - purchase : null;
    const premium =
      spot != null
        ? premiumOverSpotPercent(purchase, fine, spot.pricePlnPerGram)
        : null;

    totalInvested += purchase;
    totalFineGrams += fine;
    if (spotValue != null) {
      totalSpotValue += spotValue;
      hasSpot = true;
    }

    items.push({
      ...inst,
      bullion,
      fine_grams: fine,
      purchase_price_pln: purchase,
      spot_value_pln: spotValue,
      spot_pnl_pln: spotPnl,
      premium_pct: premium,
      payment_account_name: bullion.payment_account_name ?? inst.account_name,
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name, "pl", { sensitivity: "base" }));

  return {
    items,
    totalInvested,
    totalSpotValue: hasSpot ? totalSpotValue : null,
    totalSpotPnl: hasSpot ? totalSpotValue - totalInvested : null,
    totalFineGrams,
    spotPricePlnPerGram: spot?.pricePlnPerGram ?? null,
    spotSource: spot?.source ?? null,
    spotFetchedAt: spot?.fetchedAt ?? null,
  };
}
