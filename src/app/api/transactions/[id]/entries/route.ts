import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signedAmountPln } from "@/lib/balances/invariants";
import {
  buildEntriesForTransaction,
  validateEntriesBalanced,
} from "@/lib/transactions/build-entries";
import type { TransactionType } from "@/types/database";

interface EntryUpdate {
  id: string;
  account_id?: string;
  amount?: number;
  currency?: string;
  exchange_rate?: number;
}

interface CreateBody {
  source_account_id?: string;
  target_account_id?: string;
  amount: number;
  currency?: string;
  exchange_rate?: number;
  confirm?: boolean;
}

export async function POST(
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

    const body = (await request.json()) as CreateBody;
    const amount = Number(body.amount);
    if (!amount || Number.isNaN(amount)) {
      return NextResponse.json({ error: "Wymagana kwota" }, { status: 400 });
    }

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .select("id, type, status")
      .eq("id", transactionId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (txErr || !tx) {
      return NextResponse.json({ error: "Nie znaleziono transakcji" }, { status: 404 });
    }

    const row = tx as { id: string; type: TransactionType; status: string };

    const { count: existingCount } = await supabase
      .from("transaction_entries")
      .select("id", { count: "exact", head: true })
      .eq("transaction_id", transactionId);

    if ((existingCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "Transakcja ma już wpisy — użyj edycji" },
        { status: 409 }
      );
    }

    const entries = buildEntriesForTransaction({
      type: row.type,
      amount,
      currency: body.currency ?? "PLN",
      exchangeRate: Number(body.exchange_rate ?? 1),
      sourceAccountId: body.source_account_id,
      targetAccountId: body.target_account_id,
    });

    validateEntriesBalanced(row.type, entries);

    const { error: insertErr } = await supabase.from("transaction_entries").insert(
      entries.map((e) => ({
        transaction_id: transactionId,
        user_id: user.id,
        ...e,
      })) as never
    );

    if (insertErr) throw insertErr;

    if (body.confirm) {
      const { error: statusErr } = await supabase
        .from("transactions")
        .update({ status: "confirmed" } as never)
        .eq("id", transactionId)
        .eq("user_id", user.id);

      if (statusErr) throw statusErr;
    }

    return NextResponse.json({ ok: true, entries_created: entries.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd tworzenia wpisów";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
