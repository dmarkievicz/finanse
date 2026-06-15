import type { VaultCoinSeries } from "@/lib/gold/coin-stock-images";

/** Zweryfikowane URL-e miniaturek z Wikimedia Commons (pobierane przez proxy API). */
export const COIN_UPSTREAM_IMAGES: Record<VaultCoinSeries, string> = {
  krugerrand:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Krugerrand_1oz_2017_Reverse.jpg/330px-Krugerrand_1oz_2017_Reverse.jpg",
  philharmonic:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Wiener_Philharmoniker_coin_Reverse.jpg/330px-Wiener_Philharmoniker_coin_Reverse.jpg",
  maple:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/1-ounce_Silver_Canadian_Maple_Leaf_MADE_OF_.9999%25_PURE_SILVER.jpg/330px-1-ounce_Silver_Canadian_Maple_Leaf_MADE_OF_.9999%25_PURE_SILVER.jpg",
  britannia:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/British_Britannia_Silver_2021_1Oz._.999_Fine_Silver_2_Pounds_English_coin.jpg/330px-British_Britannia_Silver_2021_1Oz._.999_Fine_Silver_2_Pounds_English_coin.jpg",
  kangaroo:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4a/Monedas_bullion_1.jpg/330px-Monedas_bullion_1.jpg",
  eagle:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Obverse_of_a_stunning_One-tenth_oz_American_Gold_Eagle_of_2017%2C_photographed_from_a_personal_collection%2C_by_Yogabrata_Chakraborty%2C_on_July_22%2C_2023.jpg/330px-Obverse_of_a_stunning_One-tenth_oz_American_Gold_Eagle_of_2017%2C_photographed_from_a_personal_collection%2C_by_Yogabrata_Chakraborty%2C_on_July_22%2C_2023.jpg",
};

export function isVaultCoinSeries(value: string): value is VaultCoinSeries {
  return value in COIN_UPSTREAM_IMAGES;
}

export function coinImageProxyPath(series: VaultCoinSeries): string {
  return `/api/coin-image/${series}`;
}
