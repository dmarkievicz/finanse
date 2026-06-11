import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface OpeningBalanceBody {
  account_id: string;
  amount_pln: number;
  description?: string;
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

    const body = (await request.json()) as OpeningBalanceBody;
    if (!body.account_id || body.amount_pln == null || Number.isNaN(Number(body.amount_pln))) {
      return NextResponse.json({ error: "Wymagane: account_id, amount_pln" }, { status: 400 });
    }

    const { data: settings, error: settingsError } = await supabase
      .from("user_settings")
      .select("analysis_start_date")
      .eq("user_id", user.id)
      .maybeSingle();

    if (settingsError) throw settingsError;

    const startDate = (settings as { analysis_start_date: string | null } | null)
      ?.analysis_start_date;

    if (!startDate) {
      return NextResponse.json(
        { error: "Najpierw ustaw datę startu analiz w Ustawieniach" },
        { status: 400 }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id, name, default_currency")
      .eq("id", body.account_id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
    }

    const acc = account as { id: string; name: string; default_currency: string };

    const { data: existingTxs, error: findError } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_opening_balance", true)
      .eq("date", startDate)
      .is("deleted_at", null);

    if (findError) throw findError;

    for (const tx of (existingTxs ?? []) as { id: string }[]) {
      const { data: entries, error: entErr } = await supabase
        .from("transaction_entries")
        .select("account_id")
        .eq("transaction_id", tx.id);

      if (entErr) throw entErr;
      if (!entries?.some((e) => (e as { account_id: string }).account_id === acc.id)) continue;

      const { error: delError } = await supabase.from("transactions").delete().eq("id", tx.id);
      if (delError) throw delError;
    }

    const amountPln = Number(body.amount_pln);
    const currency = acc.default_currency;
    const exchangeRate = currency === "PLN" ? 1 : 1;
    const amount = amountPln;

    const description =
      body.description?.trim() ||
      `Saldo otwarcia — ${acc.name} na dzień ${startDate}`;

    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        date: startDate,
        type: "adjustment",
        description,
        details: "Saldo początkowe ustawione ręcznie",
        status: "confirmed",
        is_opening_balance: true,
      } as never)
      .select("id")
      .single();

    if (txError) throw txError;

    const { error: entryError } = await supabase.from("transaction_entries").insert({
      transaction_id: (transaction as { id: string }).id,
      user_id: user.id,
      account_id: acc.id,
      amount,
      currency,
      exchange_rate: exchangeRate,
      amount_pln: amountPln,
      sort_order: 0,
    } as never);

    if (entryError) throw entryError;

    return NextResponse.json({
      ok: true,
      transaction_id: (transaction as { id: string }).id,
      date: startDate,
      amount_pln: amountPln,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd zapisu salda początkowego";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
