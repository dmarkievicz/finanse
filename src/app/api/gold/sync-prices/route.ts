import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchGoldSpotPrice } from "@/lib/gold/spot-price";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const spot = await fetchGoldSpotPrice();
    const today = new Date().toISOString().slice(0, 10);

    const { data: instruments, error: listErr } = await supabase
      .from("instruments")
      .select("id")
      .eq("user_id", user.id)
      .eq("instrument_type", "GOLD")
      .eq("is_active", true)
      .is("deleted_at", null);

    if (listErr) throw listErr;

    const ids = (instruments ?? []).map((i) => (i as { id: string }).id);
    if (ids.length === 0) {
      return NextResponse.json({
        ok: true,
        updated: 0,
        spot,
        message: "Brak aktywnych pozycji złota do wyceny.",
      });
    }

    const rows = ids.map((instrument_id) => ({
      user_id: user.id,
      instrument_id,
      date: today,
      price: spot.pricePlnPerGram,
      currency: "PLN",
      source: "api",
    }));

    const { error: upsertErr } = await supabase
      .from("instrument_prices")
      .upsert(rows as never[], { onConflict: "instrument_id,date" });

    if (upsertErr) throw upsertErr;

    return NextResponse.json({
      ok: true,
      updated: ids.length,
      spot,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd synchronizacji cen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
