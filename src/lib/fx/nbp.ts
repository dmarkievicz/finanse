const NBP_TABLE_A = "https://api.nbp.pl/api/exchangerates/tables/a/?format=json";
const FETCH_TIMEOUT_MS = 12_000;

export const FX_CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CZK"] as const;

export interface NbpRateRow {
  currency: string;
  code: string;
  mid: number;
}

async function fetchNbpTable(): Promise<NbpRateRow[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(NBP_TABLE_A, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) throw new Error(`NBP HTTP ${res.status}`);
    const json = (await res.json()) as { rates: NbpRateRow[] }[];
    return json[0]?.rates ?? [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNbpRatesForDate(
  date: string
): Promise<{ date: string; rates: Record<string, number> }> {
  const table = await fetchNbpTable();
  const rates: Record<string, number> = { PLN: 1 };

  for (const code of FX_CURRENCIES) {
    const row = table.find((r) => r.code === code);
    if (row) rates[code] = row.mid;
  }

  return { date, rates };
}

export async function fetchNbpHistoricalRate(
  currency: string,
  date: string
): Promise<number | null> {
  if (currency === "PLN") return 1;
  const code = currency.toLowerCase();
  const url = `https://api.nbp.pl/api/exchangerates/rates/a/${code}/${date}/?format=json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (res.status === 404) {
      const fallback = await fetchNbpRatesForDate(date);
      return fallback.rates[currency] ?? null;
    }
    if (!res.ok) return null;
    const json = (await res.json()) as { rates: { mid: number }[] };
    return json.rates?.[0]?.mid ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
