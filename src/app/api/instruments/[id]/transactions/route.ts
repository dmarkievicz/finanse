import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: instrumentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const body = await request.json();
    const type = String(body.type ?? "buy");
    const date = String(body.date);
    const amount = Number(body.amount);
    const currency = String(body.currency ?? "PLN");

    if (!date || Number.isNaN(amount)) {
      return NextResponse.json({ error: "Wymagane: data i kwota" }, { status: 400 });
    }

    const { data: inst, error: instErr } = await supabase
      .from("instruments")
      .select("id, currency")
      .eq("id", instrumentId)
      .eq("user_id", user.id)
      .single();

    if (instErr || !inst) {
      return NextResponse.json({ error: "Nie znaleziono instrumentu" }, { status: 404 });
    }

    const signedAmount = ["sell", "fee", "tax"].includes(type) ? -Math.abs(amount) : Math.abs(amount);
    const quantity = body.quantity != null ? Number(body.quantity) : null;
    const pricePerUnit = body.price_per_unit != null ? Number(body.price_per_unit) : null;

    const { data, error } = await supabase
      .from("investment_transactions")
      .insert({
        user_id: user.id,
        instrument_id: instrumentId,
        date,
        type,
        quantity,
        price_per_unit: pricePerUnit,
        amount: Math.abs(amount),
        currency,
        exchange_rate: 1,
        amount_pln: signedAmount,
        fees: Number(body.fees ?? 0),
        notes: body.notes ?? null,
      } as never)
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
