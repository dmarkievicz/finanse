import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const instrument_type = String(body.instrument_type ?? "OTHER");
    const currency = String(body.currency ?? "PLN");

    if (!name) {
      return NextResponse.json({ error: "Wymagana nazwa instrumentu" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("instruments")
      .insert({
        user_id: user.id,
        name,
        symbol: body.symbol?.trim() || null,
        instrument_type,
        currency,
        account_id: body.account_id || null,
        metadata: body.metadata ?? {},
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
