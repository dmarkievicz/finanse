import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchNbpHistoricalRate } from "@/lib/fx/nbp";
import { lookupExchangeRate, syncNbpExchangeRates } from "@/lib/fx/store-rates";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const currency = (searchParams.get("currency") ?? "EUR").toUpperCase();
    const date = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

    let found = await lookupExchangeRate(supabase, currency, date);
    if (!found) {
      const mid = await fetchNbpHistoricalRate(currency, date);
      if (mid) {
        const { data: existing } = await supabase
          .from("exchange_rates")
          .select("id")
          .is("user_id", null)
          .eq("date", date)
          .eq("from_currency", currency)
          .eq("to_currency", "PLN")
          .maybeSingle();

        if (existing) {
          await supabase
            .from("exchange_rates")
            .update({ rate: mid, source: "nbp" } as never)
            .eq("id", (existing as { id: string }).id);
        } else {
          await supabase.from("exchange_rates").insert({
            user_id: null,
            date,
            from_currency: currency,
            to_currency: "PLN",
            rate: mid,
            source: "nbp",
          } as never);
        }
        found = { rate: mid, source: "nbp", date };
      }
    }

    if (!found) {
      return NextResponse.json({ error: "Brak kursu dla tej waluty i daty" }, { status: 404 });
    }

    return NextResponse.json({ currency, ...found });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const result = await syncNbpExchangeRates(supabase);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd synchronizacji NBP";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
