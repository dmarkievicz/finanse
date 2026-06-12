import { TROY_OZ_GRAMS } from "@/lib/gold/bullion-metadata";

export interface GoldSpotPrice {
  pricePlnPerGram: number;
  pricePlnPerOz: number;
  source: string;
  fetchedAt: string;
}

const FETCH_TIMEOUT_MS = 12_000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchNbpUsdPln(): Promise<number> {
  const res = await fetchWithTimeout("https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json");
  if (!res.ok) throw new Error(`NBP HTTP ${res.status}`);
  const json = (await res.json()) as { rates: { mid: number }[] };
  const mid = json.rates?.[0]?.mid;
  if (!mid) throw new Error("Brak kursu USD z NBP");
  return mid;
}

async function fetchFromGoldApi(): Promise<GoldSpotPrice | null> {
  const key = process.env.GOLD_API_KEY?.trim();
  if (!key) return null;

  const res = await fetchWithTimeout("https://www.goldapi.io/api/XAU/PLN", {
    headers: { "x-access-token": key },
  });
  if (!res.ok) return null;

  const json = (await res.json()) as { price?: number };
  if (!json.price || Number.isNaN(json.price)) return null;

  return {
    pricePlnPerOz: json.price,
    pricePlnPerGram: json.price / TROY_OZ_GRAMS,
    source: "goldapi.io",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFromMetalsDev(): Promise<GoldSpotPrice | null> {
  const key = process.env.METALS_DEV_API_KEY?.trim();
  if (!key) return null;

  const res = await fetchWithTimeout(
    `https://api.metals.dev/v1/latest?api_key=${encodeURIComponent(key)}&currency=PLN&unit=g`
  );
  if (!res.ok) return null;

  const json = (await res.json()) as { status?: string; metals?: { gold?: number } };
  const perGram = json.metals?.gold;
  if (!perGram || Number.isNaN(perGram)) return null;

  return {
    pricePlnPerGram: perGram,
    pricePlnPerOz: perGram * TROY_OZ_GRAMS,
    source: "metals.dev",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchFromGoldPriceOrg(): Promise<GoldSpotPrice | null> {
  const res = await fetchWithTimeout("https://data-asg.goldprice.org/dbXRates/USD");
  if (!res.ok) return null;

  const json = (await res.json()) as { items?: { curr?: string; xauPrice?: number }[] };
  const xauUsd = json.items?.[0]?.xauPrice;
  if (!xauUsd || Number.isNaN(xauUsd)) return null;

  const usdPln = await fetchNbpUsdPln();
  const pricePlnPerOz = xauUsd * usdPln;

  return {
    pricePlnPerOz,
    pricePlnPerGram: pricePlnPerOz / TROY_OZ_GRAMS,
    source: "goldprice.org+nbp",
    fetchedAt: new Date().toISOString(),
  };
}

/** Pobiera aktualną cenę spot złota w PLN za gram. */
export async function fetchGoldSpotPrice(): Promise<GoldSpotPrice> {
  const providers = [fetchFromGoldApi, fetchFromMetalsDev, fetchFromGoldPriceOrg];

  for (const provider of providers) {
    try {
      const result = await provider();
      if (result) return result;
    } catch {
      // próbuj kolejnego źródła
    }
  }

  throw new Error(
    "Nie udało się pobrać ceny złota. Ustaw GOLD_API_KEY (goldapi.io) lub METALS_DEV_API_KEY."
  );
}
