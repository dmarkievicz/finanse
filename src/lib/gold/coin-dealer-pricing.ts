import { TROY_OZ_GRAMS } from "./bullion-metadata";
import type { VaultCoinSeries } from "./coin-stock-images";
import { inferCoinSeriesFromName, VAULT_WEIGHT_ROWS } from "./coin-stock-images";

/** Serie 1 oz z marżą skupu względem spot (skalibrowane przy ~15 864 PLN/oz). */
export type CoinDealerSeries = VaultCoinSeries | "bison";

const WEIGHT_TIERS_OZ = [0.1, 0.25, 0.5, 1] as const;
export type CoinWeightTierOz = (typeof WEIGHT_TIERS_OZ)[number];

/** Mnożnik ceny dla ułamkowych uncji (ta sama marża dla wszystkich serii). */
const FRACTIONAL_MULTIPLIER: Record<Exclude<CoinWeightTierOz, 1>, number> = {
  0.1: 1.029_787_561_285_247_2,
  0.25: 1.024_791_450_511_020_3,
  0.5: 1.019_791_557_669_591,
};

/** Mnożnik ceny 1 oz wg serii monetarnej. */
const SERIES_1OZ_MULTIPLIER: Record<CoinDealerSeries, number> = {
  kangaroo: 0.996_795_958_735_125_5,
  britannia: 0.996_795_958_735_125_5,
  philharmonic: 0.996_795_958_735_125_5,
  maple: 0.996_795_958_735_125_5,
  krugerrand: 0.994_796_505_874_180_8,
  eagle: 1.013_792_568_742_223_1,
  bison: 1.017_792_104_808_646_2,
};

export function inferCoinDealerSeries(name: string): CoinDealerSeries | null {
  const n = name.toLowerCase();
  if (n.includes("bizon") || n.includes("bison")) return "bison";
  return inferCoinSeriesFromName(name);
}

export function normalizeWeightTierOz(weightOz: number): CoinWeightTierOz {
  let best: CoinWeightTierOz = 1;
  let bestDiff = Infinity;
  for (const tier of WEIGHT_TIERS_OZ) {
    const diff = Math.abs(weightOz - tier);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = tier;
    }
  }
  return best;
}

export function weightOzFromVaultMeta(
  meta: Record<string, unknown>,
  weightGramsFallback?: number
): CoinWeightTierOz {
  const vaultRow = meta.vault_row != null ? Number(meta.vault_row) : null;
  if (vaultRow != null) {
    const row = VAULT_WEIGHT_ROWS.find((r) => r.row === vaultRow);
    if (row) return row.fractionOz;
  }

  const grams =
    weightGramsFallback ??
    (meta.weight_grams != null ? Number(meta.weight_grams) : TROY_OZ_GRAMS);
  return normalizeWeightTierOz(grams / TROY_OZ_GRAMS);
}

export function roundCoinPricePln(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Cena skupu / wycena monety wg spotu i marży dealera.
 * Wzór: spot × waga [× mnożnik ułamka] lub spot × mnożnik serii (1 oz).
 */
export function coinDealerPricePln(
  spotPlnPerOz: number,
  weightOz: number,
  series: CoinDealerSeries | null
): number {
  if (!Number.isFinite(spotPlnPerOz) || spotPlnPerOz <= 0) return 0;

  const tier = normalizeWeightTierOz(weightOz);
  const metal = spotPlnPerOz * tier;

  if (tier < 1) {
    const fractionalTier = tier as Exclude<CoinWeightTierOz, 1>;
    return roundCoinPricePln(metal * FRACTIONAL_MULTIPLIER[fractionalTier]);
  }

  const seriesKey = series ?? "maple";
  const multiplier = SERIES_1OZ_MULTIPLIER[seriesKey] ?? SERIES_1OZ_MULTIPLIER.maple;
  return roundCoinPricePln(metal * multiplier);
}

export function vaultCoinMarketValuePln(input: {
  name: string;
  metadata: Record<string, unknown>;
  spotPlnPerOz: number | null;
}): number {
  const meta = input.metadata ?? {};
  const purchase = Number(meta.purchase_price_pln ?? 0);

  if (!input.spotPlnPerOz || input.spotPlnPerOz <= 0) {
    return Number(meta.current_value_pln ?? purchase);
  }

  const series = (meta.coin_series as CoinDealerSeries) ?? inferCoinDealerSeries(input.name);
  const weightOz = weightOzFromVaultMeta(
    meta,
    meta.weight_grams != null ? Number(meta.weight_grams) : undefined
  );

  return coinDealerPricePln(input.spotPlnPerOz, weightOz, series);
}
