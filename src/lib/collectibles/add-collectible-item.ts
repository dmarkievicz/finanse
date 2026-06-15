import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { parseCollectibleMetadata } from "@/lib/collectibles/collectible-metadata";

export interface AddCollectibleItemInput {
  portfolio_id: string;
  name: string;
  purchase_price_pln: number;
  current_value_pln?: number;
  purchase_date?: string;
  set_number?: string;
  notes?: string;
}

export async function addCollectibleItem(
  supabase: ServerSupabaseClient,
  userId: string,
  input: AddCollectibleItemInput
): Promise<{ instrumentId: string }> {
  const currentValue = input.current_value_pln ?? input.purchase_price_pln;
  const metadata = {
    collectible_kind: "lego",
    purchase_price_pln: input.purchase_price_pln,
    current_value_pln: currentValue,
    estimated_value_pln: currentValue,
    purchase_date: input.purchase_date ?? new Date().toISOString().slice(0, 10),
    portfolio_id: input.portfolio_id,
    vault_item: true,
    set_number: input.set_number,
    notes: input.notes,
  };

  const { data: inst, error: instErr } = await supabase
    .from("instruments")
    .insert({
      user_id: userId,
      name: input.name,
      instrument_type: "COLLECTIBLE",
      currency: "PLN",
      metadata,
    } as never)
    .select("id")
    .single();

  let instrumentId: string;
  if (instErr?.code === "23514") {
    const { data: fb, error: fbErr } = await supabase
      .from("instruments")
      .insert({
        user_id: userId,
        name: input.name,
        instrument_type: "OTHER",
        currency: "PLN",
        metadata,
      } as never)
      .select("id")
      .single();
    if (fbErr) throw fbErr;
    instrumentId = (fb as { id: string }).id;
  } else if (instErr) {
    throw instErr;
  } else {
    instrumentId = (inst as { id: string }).id;
  }

  const { error: txErr } = await supabase.from("investment_transactions").insert({
    user_id: userId,
    instrument_id: instrumentId,
    date: input.purchase_date ?? new Date().toISOString().slice(0, 10),
    type: "buy",
    quantity: 1,
    price_per_unit: input.purchase_price_pln,
    amount: input.purchase_price_pln,
    currency: "PLN",
    exchange_rate: 1,
    amount_pln: input.purchase_price_pln,
    fees: 0,
    notes: input.notes ?? "Pozycja kolekcji (bez transakcji bankowej)",
  } as never);

  if (txErr) throw txErr;

  return { instrumentId };
}

export async function fetchCollectibleItemsForPortfolio(
  supabase: ServerSupabaseClient,
  portfolioId: string
) {
  const { data, error } = await supabase
    .from("instruments")
    .select("id, name, metadata")
    .is("deleted_at", null)
    .eq("is_active", true)
    .or("instrument_type.eq.COLLECTIBLE,instrument_type.eq.OTHER")
    .filter("metadata->>portfolio_id", "eq", portfolioId);

  if (error) throw error;

  return (data ?? []).map((row) => {
    const meta = parseCollectibleMetadata(
      (row as { metadata: Record<string, unknown> }).metadata ?? {}
    );
    const purchase = meta?.purchase_price_pln ?? 0;
    const current = Number(
      (row as { metadata: Record<string, unknown> }).metadata?.current_value_pln ??
        meta?.estimated_value_pln ??
        purchase
    );
    return {
      id: (row as { id: string }).id,
      name: (row as { name: string }).name,
      purchase_price_pln: purchase,
      current_value_pln: current,
      pnl_pln: current - purchase,
      set_number: meta?.set_number ?? null,
    };
  });
}
