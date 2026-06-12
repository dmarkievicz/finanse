import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchGoldSpotPrice } from "@/lib/gold/spot-price";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const spot = await fetchGoldSpotPrice();
    return NextResponse.json(spot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd pobierania ceny złota";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
