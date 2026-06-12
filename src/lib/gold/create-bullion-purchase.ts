import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { isGoldLedgerAccount } from "@/lib/accounts/classification";
import { buildGoldBullionMetadata } from "@/lib/gold/bullion-metadata";
import { signedAmountPln } from "@/lib/balances/invariants";

export interface CreateBullionPurchaseInput {
  name: string;
  payment_account_id: string;
  purchase_date: string;
  purchase_price_pln: number;
  weight_grams: number;
  purity?: number;
  mint?: string;
  year?: number;
  bullion_kind?: "coin" | "bar";
  symbol?: string;
  notes?: string;
  create_bank_expense?: boolean;
}

export interface CreateBullionPurchaseResult {
  instrumentId: string;
  cashTransactionId: string | null;
  investmentTransactionId: string;
}

export async function createBullionPurchase(
  supabase: ServerSupabaseClient,
  userId: string,
  input: CreateBullionPurchaseInput
): Promise<CreateBullionPurchaseResult> {
  const { data: payAccount, error: accErr } = await supabase
    .from("accounts")
    .select("id, name, account_type, default_currency")
    .eq("id", input.payment_account_id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (accErr || !payAccount) {
    throw new Error("Nie znaleziono konta płatności");
  }

  const acc = payAccount as {
    id: string;
    name: string;
    account_type: string;
    default_currency: string;
  };

  if (isGoldLedgerAccount(acc.name)) {
    throw new Error("Złoto nie jest kontem — wybierz konto bankowe (np. mBank), z którego płacisz");
  }

  const bullionKind = input.bullion_kind === "bar" ? "bar" : "coin";
  const pricePerGram = input.purchase_price_pln / input.weight_grams;

  const metadata = buildGoldBullionMetadata({
    bullion_kind: bullionKind,
    weight_grams: input.weight_grams,
    purity: input.purity,
    mint: input.mint,
    year: input.year,
    purchase_price_pln: input.purchase_price_pln,
    purchase_date: input.purchase_date,
    payment_account_id: acc.id,
    payment_account_name: acc.name,
  });

  const { data: inst, error: instErr } = await supabase
    .from("instruments")
    .insert({
      user_id: userId,
      name: input.name,
      symbol: input.symbol?.trim() || null,
      instrument_type: "GOLD",
      currency: "PLN",
      account_id: acc.id,
      metadata,
    } as never)
    .select("id")
    .single();

  if (instErr) throw instErr;
  const instrumentId = (inst as { id: string }).id;

  let cashTransactionId: string | null = null;

  if (input.create_bank_expense !== false) {
    const details = `Inwestycja · Zakup złota: ${input.name}`;
    const { data: cashTx, error: cashTxErr } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        date: input.purchase_date,
        type: "expense",
        description: "Zakup bulionu",
        details,
        status: "confirmed",
      } as never)
      .select("id")
      .single();

    if (cashTxErr) throw cashTxErr;
    cashTransactionId = (cashTx as { id: string }).id;

    const currency = acc.default_currency ?? "PLN";
    const rate = currency === "PLN" ? 1 : 1;
    const signedAmount = -Math.abs(input.purchase_price_pln);

    const { error: entryErr } = await supabase.from("transaction_entries").insert({
      transaction_id: cashTransactionId,
      user_id: userId,
      account_id: acc.id,
      amount: signedAmount,
      currency,
      exchange_rate: rate,
      amount_pln: signedAmountPln(signedAmount, rate),
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
      quantity: input.weight_grams,
      price_per_unit: pricePerGram,
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
