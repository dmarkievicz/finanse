import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { isAssetLedgerAccount } from "@/lib/accounts/classification";
import { buildCollectibleMetadata } from "@/lib/collectibles/collectible-metadata";
import { signedAmountPln } from "@/lib/balances/invariants";

export interface CreateCollectiblePurchaseInput {
  name: string;
  payment_account_id: string;
  purchase_date: string;
  purchase_price_pln: number;
  set_number?: string;
  condition?: string;
  estimated_value_pln?: number;
  notes?: string;
  create_bank_expense?: boolean;
}

export interface CreateCollectiblePurchaseResult {
  instrumentId: string;
  cashTransactionId: string | null;
  investmentTransactionId: string;
}

export async function createCollectiblePurchase(
  supabase: ServerSupabaseClient,
  userId: string,
  input: CreateCollectiblePurchaseInput
): Promise<CreateCollectiblePurchaseResult> {
  const { data: payAccount, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, default_currency")
    .eq("id", input.payment_account_id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (accErr || !payAccount) throw new Error("Nie znaleziono konta płatności");

  const acc = payAccount as { id: string; name: string; default_currency: string };
  if (isAssetLedgerAccount(acc.name)) {
    throw new Error("To nie jest konto bankowe — wybierz konto płatności (np. mBank, Revolut)");
  }

  const metadata = buildCollectibleMetadata({
    set_number: input.set_number,
    condition: input.condition,
    purchase_price_pln: input.purchase_price_pln,
    purchase_date: input.purchase_date,
    payment_account_id: acc.id,
    payment_account_name: acc.name,
    estimated_value_pln: input.estimated_value_pln,
  });

  const { data: inst, error: instErr } = await supabase
    .from("instruments")
    .insert({
      user_id: userId,
      name: input.name,
      instrument_type: "COLLECTIBLE",
      currency: "PLN",
      account_id: acc.id,
      metadata,
    } as never)
    .select("id")
    .single();

  let instrumentId: string;
  if (instErr?.code === "23514") {
    const { data: fallback, error: fbErr } = await supabase
      .from("instruments")
      .insert({
        user_id: userId,
        name: input.name,
        instrument_type: "OTHER",
        currency: "PLN",
        account_id: acc.id,
        metadata,
      } as never)
      .select("id")
      .single();
    if (fbErr) throw fbErr;
    instrumentId = (fallback as { id: string }).id;
  } else if (instErr) {
    throw instErr;
  } else {
    instrumentId = (inst as { id: string }).id;
  }

  let cashTransactionId: string | null = null;

  if (input.create_bank_expense !== false) {
    const { data: cashTx, error: cashTxErr } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        date: input.purchase_date,
        type: "expense",
        description: "Zakup kolekcji",
        details: `Inwestycja · ${input.name}`,
        status: "confirmed",
      } as never)
      .select("id")
      .single();

    if (cashTxErr) throw cashTxErr;
    cashTransactionId = (cashTx as { id: string }).id;

    const currency = acc.default_currency ?? "PLN";
    const signedAmount = -Math.abs(input.purchase_price_pln);

    const { error: entryErr } = await supabase.from("transaction_entries").insert({
      transaction_id: cashTransactionId,
      user_id: userId,
      account_id: acc.id,
      amount: signedAmount,
      currency,
      exchange_rate: 1,
      amount_pln: signedAmountPln(signedAmount, 1),
      sort_order: 0,
    } as never);

    if (entryErr) throw entryErr;
  }

  const { data: invTx, error: invTxErr } = await supabase
    .from("investment_transactions")
    .insert({
      user_id: userId,
      instrument_id: instrumentId,
      date: input.purchase_date,
      type: "buy",
      quantity: 1,
      price_per_unit: input.purchase_price_pln,
      amount: input.purchase_price_pln,
      currency: "PLN",
      exchange_rate: 1,
      amount_pln: input.purchase_price_pln,
      fees: 0,
      linked_transaction_id: cashTransactionId,
      notes: input.notes?.trim() || `Płatność z konta: ${acc.name}`,
    } as never)
    .select("id")
    .single();

  if (invTxErr) throw invTxErr;

  return {
    instrumentId,
    cashTransactionId,
    investmentTransactionId: (invTx as { id: string }).id,
  };
}
