import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedAmountPln } from "@/lib/balances/invariants";

interface EntryUpdate {
  id: string;
  account_id?: string;
  amount?: number;
  currency?: string;
  exchange_rate?: number;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const body = (await request.json()) as { entries: EntryUpdate[] };
    if (!body.entries?.length) {
      return NextResponse.json({ error: "Brak wpisów do aktualizacji" }, { status: 400 });
    }

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("id, type, is_opening_balance")
      .eq("id", transactionId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Nie znaleziono transakcji" }, { status: 404 });
    }

    const row = tx as { id: string; type: string; is_opening_balance: boolean };

    const { data: existing, error: exErr } = await supabase
      .from("transaction_entries")
      .select("id, account_id, amount, currency, exchange_rate, amount_pln")
      .eq("transaction_id", transactionId)
      .eq("user_id", user.id);

    if (exErr) throw exErr;

    const byId = new Map(
      (existing ?? []).map((e) => [(e as { id: string }).id, e as {
        id: string;
        account_id: string;
        amount: number;
        currency: string;
        exchange_rate: number;
        amount_pln: number;
      }])
    );

    for (const patch of body.entries) {
      const cur = byId.get(patch.id);
      if (!cur) {
        return NextResponse.json({ error: `Nie znaleziono wpisu ${patch.id}` }, { status: 400 });
      }

      const amount = patch.amount !== undefined ? Number(patch.amount) : Number(cur.amount);
      const exchangeRate =
        patch.exchange_rate !== undefined ? Number(patch.exchange_rate) : Number(cur.exchange_rate);
      const currency = patch.currency ?? cur.currency;
      const accountId = patch.account_id ?? cur.account_id;
      const amountPln = signedAmountPln(amount, exchangeRate);

      const { error } = await supabase
        .from("transaction_entries")
        .update({
          account_id: accountId,
          amount,
          currency,
          exchange_rate: exchangeRate,
          amount_pln: amountPln,
        } as never)
        .eq("id", patch.id)
        .eq("transaction_id", transactionId)
        .eq("user_id", user.id);

      if (error) throw error;
    }

    if (["transfer", "exchange"].includes(row.type)) {
      const { data: updated } = await supabase
        .from("transaction_entries")
        .select("amount_pln")
        .eq("transaction_id", transactionId);

      const sum = (updated ?? []).reduce((s, e) => s + Number((e as { amount_pln: number }).amount_pln), 0);
      if (Math.abs(sum) > 0.05) {
        return NextResponse.json(
          { error: `Transfer nie jest zbilansowany w PLN (suma: ${sum.toFixed(2)})` },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd aktualizacji wpisów";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
