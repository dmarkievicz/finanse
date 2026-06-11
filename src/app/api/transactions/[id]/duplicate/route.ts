import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchTransactionDetail } from "@/lib/queries/transaction-detail";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const source = await fetchTransactionDetail(supabase, id);
    if (!source) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
    }

    const { data: tx, error: txErr } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        date: source.date,
        type: source.type,
        status: "confirmed",
        description: source.description,
        details: source.details ? `${source.details} (kopia)` : "Kopia",
        category_id: source.category_id,
        subcategory_id: source.subcategory_id,
      } as never)
      .select("id")
      .single();

    if (txErr) throw txErr;

    const newId = (tx as { id: string }).id;

    if (source.entries.length) {
      const { error: entErr } = await supabase.from("transaction_entries").insert(
        source.entries.map((e, i) => ({
          transaction_id: newId,
          user_id: user.id,
          account_id: e.account_id,
          amount: e.amount,
          currency: e.currency,
          exchange_rate: e.exchange_rate,
          amount_pln: e.amount_pln,
          sort_order: i,
        })) as never
      );
      if (entErr) throw entErr;
    }

    return NextResponse.json({ ok: true, id: newId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd duplikacji";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
