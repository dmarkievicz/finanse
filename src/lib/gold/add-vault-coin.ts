import type { ServerSupabaseClient } from "@/lib/supabase/server";
import {
  buildGoldBullionMetadata,
  TROY_OZ_GRAMS,
  type BullionKind,
} from "@/lib/gold/bullion-metadata";
import type { VaultCoinSeries } from "@/lib/gold/coin-stock-images";

export interface AddVaultCoinInput {
  portfolio_id: string;
  name: string;
  series?: VaultCoinSeries;
  vault_row?: number;
  vault_col?: number;
  vault_slot?: "grid" | "eagle";
  weight_grams: number;
  purity?: number;
  purchase_price_pln: number;
  current_value_pln?: number;
  purchase_date?: string;
  mint?: string;
  bullion_kind?: BullionKind;
  notes?: string;
}

export function weightGramsFromOz(fractionOz: number): number {
  return Math.round(fractionOz * TROY_OZ_GRAMS * 10000) / 10000;
}

export async function addVaultCoin(
  supabase: ServerSupabaseClient,
  userId: string,
  input: AddVaultCoinInput
): Promise<{ instrumentId: string }> {
  const currentValue = input.current_value_pln ?? input.purchase_price_pln;
  const series = input.series;

  const metadata = {
    ...buildGoldBullionMetadata({
      bullion_kind: input.bullion_kind ?? "coin",
      weight_grams: input.weight_grams,
      purity: input.purity ?? 0.9999,
      mint: input.mint,
      purchase_price_pln: input.purchase_price_pln,
      purchase_date: input.purchase_date,
    }),
    portfolio_id: input.portfolio_id,
    vault_item: true,
    vault_slot: input.vault_slot ?? "grid",
    vault_row: input.vault_row,
    vault_col: input.vault_col,
    coin_series: series,
    current_value_pln: currentValue,
    notes: input.notes,
  };

  const { data: inst, error: instErr } = await supabase
    .from("instruments")
    .insert({
      user_id: userId,
      name: input.name,
      instrument_type: "GOLD",
      currency: "PLN",
      metadata,
    } as never)
    .select("id")
    .single();

  if (instErr) throw instErr;

  const instrumentId = (inst as { id: string }).id;

  const { error: txErr } = await supabase.from("investment_transactions").insert({
    user_id: userId,
    instrument_id: instrumentId,
    date: input.purchase_date ?? new Date().toISOString().slice(0, 10),
    type: "buy",
    quantity: input.weight_grams,
    price_per_unit: input.purchase_price_pln / input.weight_grams,
    amount: input.purchase_price_pln,
    currency: "PLN",
    exchange_rate: 1,
    amount_pln: input.purchase_price_pln,
    fees: 0,
    notes: input.notes ?? "Pozycja Vault (bez transakcji bankowej)",
  } as never);

  if (txErr) throw txErr;

  return { instrumentId };
}
