import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { normalizeCurrency } from "@/lib/fx/convert";
import { FX_CURRENCIES, fetchNbpHistoricalRate, fetchNbpRatesForDate } from "@/lib/fx/nbp";

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
  const code = normalizeCurrency(currency);
  if (code === "PLN") return { rate: 1, source: "pln", date };

  const { data, error } = await supabase
    .from("exchange_rates")
    .select("rate, source, date")
    .eq("from_currency", code)
    .eq("to_currency", "PLN")
    .is("user_id", null)
    .lte("date", date)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as { rate: number; source: string; date: string };
  return { rate: Number(row.rate), source: row.source, date: row.date };
}

async function lookupUserValuationRate(
  supabase: ServerSupabaseClient,
  code: string,
  date: string
): Promise<{ rate: number; source: string; date: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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
  if (!userRow) return null;

  const row = userRow as { rate: number; source: string; date: string };
  return { rate: Number(row.rate), source: row.source, date: row.date };
}

async function liveNbpRate(code: string, date: string): Promise<number | null> {
  try {
    const { rates } = await fetchNbpRatesForDate(date);
    if (rates[code]) return rates[code];
  } catch {
    // fallback poniżej
  }
  return fetchNbpHistoricalRate(code, date);
}

/** Kurs wyceny portfela (PLN za 1 jednostkę obcą): ręczny → baza NBP → live NBP. */
export async function lookupValuationRate(
  supabase: ServerSupabaseClient,
  currency: string,
  date: string
): Promise<{ rate: number; source: string; date: string } | null> {
  const code = normalizeCurrency(currency);
  if (code === "PLN") return { rate: 1, source: "pln", date };

  const userRate = await lookupUserValuationRate(supabase, code, date);
  if (userRate) return userRate;

  const stored = await lookupExchangeRate(supabase, code, date);
  if (stored) return stored;

  const mid = await liveNbpRate(code, date);
  if (mid == null) return null;

  return { rate: mid, source: "nbp-live", date };
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
  if (unique.length === 0) return map;

  let liveTable: Record<string, number> = {};
  try {
    const { rates } = await fetchNbpRatesForDate(date);
    liveTable = rates;
  } catch {
    liveTable = {};
  }

  await Promise.all(
    unique.map(async (code) => {
      const userRate = await lookupUserValuationRate(supabase, code, date);
      if (userRate) {
        map.set(code, userRate.rate);
        return;
      }

      const stored = await lookupExchangeRate(supabase, code, date);
      if (stored) {
        map.set(code, stored.rate);
        return;
      }

      if (liveTable[code]) {
        map.set(code, liveTable[code]);
        return;
      }

      const mid = await fetchNbpHistoricalRate(code, date);
      if (mid) map.set(code, mid);
    })
  );

  return map;
}

/** Pobiera kursy NBP i zapisuje do bazy (best-effort). */
export async function ensureValuationRates(
  supabase: ServerSupabaseClient,
  date: string
): Promise<void> {
  try {
    await syncNbpExchangeRates(supabase, date);
  } catch {
    // live NBP w fetchValuationRatesMap wystarczy do wyświetlania
  }
}
