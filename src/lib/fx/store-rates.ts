import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { FX_CURRENCIES, fetchNbpRatesForDate } from "@/lib/fx/nbp";

export async function syncNbpExchangeRates(
  supabase: ServerSupabaseClient,
  date = new Date().toISOString().slice(0, 10)
): Promise<{ date: string; synced: number }> {
  const { rates } = await fetchNbpRatesForDate(date);
  let synced = 0;

  for (const code of FX_CURRENCIES) {
    const rate = rates[code];
    if (!rate) continue;

    const { data: existing } = await supabase
      .from("exchange_rates")
      .select("id")
      .is("user_id", null)
      .eq("date", date)
      .eq("from_currency", code)
      .eq("to_currency", "PLN")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("exchange_rates")
        .update({ rate, source: "nbp" } as never)
        .eq("id", (existing as { id: string }).id);
      if (!error) synced++;
    } else {
      const { error } = await supabase.from("exchange_rates").insert({
        user_id: null,
        date,
        from_currency: code,
        to_currency: "PLN",
        rate,
        source: "nbp",
      } as never);
      if (!error) synced++;
    }
  }

  return { date, synced };
}

export async function lookupExchangeRate(
  supabase: ServerSupabaseClient,
  currency: string,
  date: string
): Promise<{ rate: number; source: string; date: string } | null> {
  if (currency === "PLN") return { rate: 1, source: "pln", date };

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate, source, date")
    .eq("from_currency", currency)
    .eq("to_currency", "PLN")
    .lte("date", date)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as { rate: number; source: string; date: string };
  return { rate: Number(row.rate), source: row.source, date: row.date };
}
