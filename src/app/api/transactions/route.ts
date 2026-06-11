import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { matchCategoryFromRules } from "@/lib/categorization/match-rule";
import { signedAmountPln } from "@/lib/balances/invariants";

type TxType = "income" | "expense" | "transfer" | "exchange" | "adjustment";

interface CreateTransactionBody {
  date: string;
  type: TxType;
  account_id?: string;
  source_account_id?: string;
  target_account_id?: string;
  amount?: number;
  source_amount?: number;
  target_amount?: number;
  currency?: string;
  source_currency?: string;
  target_currency?: string;
  source_exchange_rate?: number;
  target_exchange_rate?: number;
  category_id?: string | null;
  description?: string;
  details?: string;
}

async function loadActiveRules(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from("categorization_rules")
    .select("id, pattern, category_id, subcategory_id, priority")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  return (data ?? []) as {
    id: string;
    pattern: string;
    category_id: string;
    subcategory_id: string | null;
    priority: number;
  }[];
}

async function getAccount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  accountId: string
) {
  const { data, error } = await supabase
    .from("accounts")
    .select("id, default_currency")
    .eq("id", accountId)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  return data as { id: string; default_currency: string };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const body = (await request.json()) as CreateTransactionBody;
    if (!body.date || !body.type) {
      return NextResponse.json({ error: "Wymagane: data, typ" }, { status: 400 });
    }

    if (body.type !== "exchange" && body.amount == null) {
      return NextResponse.json({ error: "Wymagane: kwota" }, { status: 400 });
    }

    const allowed: TxType[] = ["income", "expense", "transfer", "exchange", "adjustment"];
    if (!allowed.includes(body.type)) {
      return NextResponse.json({ error: "Nieobsługiwany typ transakcji" }, { status: 400 });
    }

    const rules = await loadActiveRules(supabase, user.id);
    const matchText = [body.details, body.description].filter(Boolean).join(" ");
    const autoMatch = matchCategoryFromRules(matchText, rules);

    const category_id = body.category_id ?? autoMatch?.category_id ?? null;
    const subcategory_id = autoMatch?.subcategory_id ?? null;

    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        date: body.date,
        type: body.type,
        description: body.description ?? null,
        details: body.details ?? null,
        category_id,
        subcategory_id,
        status: "confirmed",
      } as never)
      .select("id")
      .single();

    if (txError) throw txError;
    const txId = (tx as { id: string }).id;

    const absAmount = Math.abs(Number(body.amount ?? 0));

    if (body.type === "exchange") {
      if (!body.source_account_id || !body.target_account_id) {
        return NextResponse.json(
          { error: "Przewalutowanie wymaga konta źródłowego i docelowego" },
          { status: 400 }
        );
      }
      const sourceAmt = Math.abs(Number(body.source_amount ?? body.amount));
      const targetAmt = Math.abs(Number(body.target_amount));
      if (!sourceAmt || !targetAmt) {
        return NextResponse.json(
          { error: "Wymagane kwoty: źródłowa i docelowa" },
          { status: 400 }
        );
      }

      const source = await getAccount(supabase, user.id, body.source_account_id);
      const target = await getAccount(supabase, user.id, body.target_account_id);
      if (!source || !target) {
        return NextResponse.json({ error: "Nie znaleziono kont" }, { status: 404 });
      }

      const sourceCurrency = body.source_currency ?? source.default_currency;
      const targetCurrency = body.target_currency ?? target.default_currency;
      const sourceRate = Number(body.source_exchange_rate ?? 1);
      const targetRate = Number(body.target_exchange_rate ?? 1);

      const { error: entryError } = await supabase.from("transaction_entries").insert([
        {
          transaction_id: txId,
          user_id: user.id,
          account_id: source.id,
          amount: -sourceAmt,
          currency: sourceCurrency,
          exchange_rate: sourceRate,
          amount_pln: signedAmountPln(-sourceAmt, sourceRate),
          sort_order: 0,
        },
        {
          transaction_id: txId,
          user_id: user.id,
          account_id: target.id,
          amount: targetAmt,
          currency: targetCurrency,
          exchange_rate: targetRate,
          amount_pln: signedAmountPln(targetAmt, targetRate),
          sort_order: 1,
        },
      ] as never);
      if (entryError) throw entryError;
    } else if (body.type === "transfer") {
      if (!body.source_account_id || !body.target_account_id) {
        return NextResponse.json({ error: "Transfer wymaga konta źródłowego i docelowego" }, { status: 400 });
      }
      const source = await getAccount(supabase, user.id, body.source_account_id);
      const target = await getAccount(supabase, user.id, body.target_account_id);
      if (!source || !target) {
        return NextResponse.json({ error: "Nie znaleziono kont transferu" }, { status: 404 });
      }
      const currency = body.currency ?? source.default_currency;
      const { error: entryError } = await supabase.from("transaction_entries").insert([
        {
          transaction_id: txId,
          user_id: user.id,
          account_id: source.id,
          amount: -absAmount,
          currency,
          exchange_rate: 1,
          amount_pln: -absAmount,
          sort_order: 0,
        },
        {
          transaction_id: txId,
          user_id: user.id,
          account_id: target.id,
          amount: absAmount,
          currency,
          exchange_rate: 1,
          amount_pln: absAmount,
          sort_order: 1,
        },
      ] as never);
      if (entryError) throw entryError;
    } else if (body.type === "adjustment") {
      if (!body.account_id) {
        return NextResponse.json({ error: "Korekta wymaga konta" }, { status: 400 });
      }
      const acc = await getAccount(supabase, user.id, body.account_id);
      if (!acc) return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
      const signed = Number(body.amount);
      const currency = body.currency ?? acc.default_currency;
      const { error: entryError } = await supabase.from("transaction_entries").insert({
        transaction_id: txId,
        user_id: user.id,
        account_id: acc.id,
        amount: signed,
        currency,
        exchange_rate: 1,
        amount_pln: signed,
        sort_order: 0,
      } as never);
      if (entryError) throw entryError;
    } else {
      if (!body.account_id) {
        return NextResponse.json({ error: "Wymagane konto" }, { status: 400 });
      }
      const acc = await getAccount(supabase, user.id, body.account_id);
      if (!acc) return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
      const currency = body.currency ?? acc.default_currency;
      const signedAmount = body.type === "expense" ? -absAmount : absAmount;
      const { error: entryError } = await supabase.from("transaction_entries").insert({
        transaction_id: txId,
        user_id: user.id,
        account_id: acc.id,
        amount: signedAmount,
        currency,
        exchange_rate: 1,
        amount_pln: signedAmount,
        sort_order: 0,
      } as never);
      if (entryError) throw entryError;
    }

    return NextResponse.json({ ok: true, id: txId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd tworzenia transakcji";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
