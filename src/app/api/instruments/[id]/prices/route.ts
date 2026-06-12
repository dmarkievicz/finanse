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
    const date = String(body.date);
    const price = Number(body.price);
    const currency = String(body.currency ?? "PLN");
    const source =
      body.source === "api" || body.source === "nbp" ? body.source : "manual";

    if (!date || Number.isNaN(price)) {
      return NextResponse.json({ error: "Wymagane: data i cena" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("instrument_prices")
      .upsert(
        {
          user_id: user.id,
          instrument_id: instrumentId,
          date,
          price,
          currency,
          source,
        } as never,
        { onConflict: "instrument_id,date" }
      )
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
