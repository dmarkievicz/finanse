import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { FX_CURRENCIES, fetchNbpHistoricalRate, fetchNbpRatesForDate } from "@/lib/fx/nbp";
import { normalizeCurrency } from "@/lib/fx/convert";

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

/** Kurs wyceny portfela: najpierw ręczny użytkownika, potem globalny NBP z bazy, na końcu live NBP. */
export async function lookupValuationRate(
  supabase: ServerSupabaseClient,
  currency: string,
  date: string
): Promise<{ rate: number; source: string; date: string } | null> {
  const code = normalizeCurrency(currency);
  if (code === "PLN") return { rate: 1, source: "pln", date };

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: userRow, error: userErr } = await supabase
      .from("exchange_rates")
      .select("rate, source, date")
      .eq("user_id", user.id)
      .eq("from_currency", code)
      .eq("to_currency", "PLN")
      .lte("date", date)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userErr) throw userErr;
    if (userRow) {
      const row = userRow as { rate: number; source: string; date: string };
      return { rate: Number(row.rate), source: row.source, date: row.date };
    }
  }

  const stored = await lookupExchangeRate(supabase, code, date);
  if (stored) return stored;

  const mid = await fetchNbpHistoricalRate(code, date);
  if (mid == null) return null;

  const { data: existing } = await supabase
    .from("exchange_rates")
    .select("id")
    .is("user_id", null)
    .eq("date", date)
    .eq("from_currency", code)
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
      from_currency: code,
      to_currency: "PLN",
      rate: mid,
      source: "nbp",
    } as never);
  }

  return { rate: mid, source: "nbp", date };
}

export async function fetchValuationRatesMap(
  supabase: ServerSupabaseClient,
  date: string,
  currencies: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const unique = [
    ...new Set(currencies.map((c) => normalizeCurrency(c)).filter((c) => c !== "PLN")),
  ];

  await Promise.all(
    unique.map(async (code) => {
      const found = await lookupValuationRate(supabase, code, date);
      if (found) map.set(code, found.rate);
    })
  );

  return map;
}
