import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { matchCategoryFromRules } from "@/lib/categorization/match-rule";
import { loadActiveCategorizationRules } from "@/lib/categorization/load-rules";
import { signedAmountPln } from "@/lib/balances/invariants";

type UserTxType = "income" | "expense" | "transfer";

interface CreateTransactionBody {
  date: string;
  type: UserTxType;
  account_id?: string;
  source_account_id?: string;
  target_account_id?: string;
  amount?: number;
  target_amount?: number;
  currency?: string;
  source_currency?: string;
  target_currency?: string;
  exchange_rate?: number;
  source_exchange_rate?: number;
  target_exchange_rate?: number;
  category_id?: string | null;
  description?: string;
  details?: string;
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

    const allowed: UserTxType[] = ["income", "expense", "transfer"];
    if (!allowed.includes(body.type)) {
      return NextResponse.json(
        { error: "Dozwolone typy: wydatek, przychód, transfer" },
        { status: 400 }
      );
    }

    if (body.amount == null) {
      return NextResponse.json({ error: "Wymagane: kwota" }, { status: 400 });
    }

    const rules = await loadActiveCategorizationRules(supabase, user.id);
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

    const absAmount = Math.abs(Number(body.amount));

    if (body.type === "transfer") {
      if (!body.source_account_id || !body.target_account_id) {
        return NextResponse.json({ error: "Transfer wymaga konta źródłowego i docelowego" }, { status: 400 });
      }
      const source = await getAccount(supabase, user.id, body.source_account_id);
      const target = await getAccount(supabase, user.id, body.target_account_id);
      if (!source || !target) {
        return NextResponse.json({ error: "Nie znaleziono kont transferu" }, { status: 404 });
      }

      const sourceCurrency = body.source_currency ?? body.currency ?? source.default_currency;
      const targetCurrency = body.target_currency ?? target.default_currency;
      const sourceRate = Number(body.source_exchange_rate ?? body.exchange_rate ?? 1);
      const targetRate = Number(body.target_exchange_rate ?? 1);
      const sourceAmt = absAmount;
      const targetAmt =
        body.target_amount != null ? Math.abs(Number(body.target_amount)) : absAmount;

      const sourcePln = signedAmountPln(-sourceAmt, sourceRate);
      const targetPln = signedAmountPln(targetAmt, targetRate);
      if (Math.abs(sourcePln + targetPln) > 0.05) {
        return NextResponse.json(
          {
            error: `Transfer niezbilansowany w PLN (różnica ${(sourcePln + targetPln).toFixed(2)} zł). Sprawdź kwoty i kursy.`,
          },
          { status: 400 }
        );
      }

      const { error: entryError } = await supabase.from("transaction_entries").insert([
        {
          transaction_id: txId,
          user_id: user.id,
          account_id: source.id,
          amount: -sourceAmt,
          currency: sourceCurrency,
          exchange_rate: sourceRate,
          amount_pln: sourcePln,
          sort_order: 0,
        },
        {
          transaction_id: txId,
          user_id: user.id,
          account_id: target.id,
          amount: targetAmt,
          currency: targetCurrency,
          exchange_rate: targetRate,
          amount_pln: targetPln,
          sort_order: 1,
        },
      ] as never);
      if (entryError) throw entryError;
    } else {
      if (!body.account_id) {
        return NextResponse.json({ error: "Wymagane konto" }, { status: 400 });
      }
      const acc = await getAccount(supabase, user.id, body.account_id);
      if (!acc) return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });

      const currency = body.currency ?? acc.default_currency ?? "PLN";
      const rate = currency === "PLN" ? 1 : Number(body.exchange_rate ?? 1);
      if (currency !== "PLN" && (!rate || rate <= 0)) {
        return NextResponse.json({ error: "Podaj kurs wymiany do PLN" }, { status: 400 });
      }

      const signedAmount = body.type === "expense" ? -absAmount : absAmount;
      const { error: entryError } = await supabase.from("transaction_entries").insert({
        transaction_id: txId,
        user_id: user.id,
        account_id: acc.id,
        amount: signedAmount,
        currency,
        exchange_rate: rate,
        amount_pln: signedAmountPln(signedAmount, rate),
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
