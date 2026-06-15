/** Stockowe URL zdjęć monet (Wikimedia / CDN) — do Vault. */
export const COIN_STOCK_IMAGES: Record<string, string> = {
  kangaroo:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/2021_Australian_Gold_Kangaroo_1_oz_reverse.jpg/440px-2021_Australian_Gold_Kangaroo_1_oz_reverse.jpg",
  britannia:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Britannia_gold_coin_reverse.jpg/440px-Britannia_gold_coin_reverse.jpg",
  philharmonic:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Wiener_Philharmoniker_Goldm%C3%BCnze_1_Unze.jpg/440px-Wiener_Philharmoniker_Goldm%C3%BCnze_1_Unze.jpg",
  maple:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Canadian_Gold_Maple_Leaf.png/440px-Canadian_Gold_Maple_Leaf.png",
  krugerrand:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Krugerrand_1oz_1980.jpg/440px-Krugerrand_1oz_1980.jpg",
  eagle:
    "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/American_Gold_Eagle_%28obverse%29.jpg/440px-American_Gold_Eagle_%28obverse%29.jpg",
};

export type VaultCoinSeries =
  | "kangaroo"
  | "britannia"
  | "philharmonic"
  | "maple"
  | "krugerrand"
  | "eagle";

export const VAULT_SERIES_LABELS: Record<VaultCoinSeries, string> = {
  kangaroo: "Australijski Kangur",
  britannia: "Britannia",
  philharmonic: "Filharmonik wiedeński",
  maple: "Kanadyjski liść klonowy",
  krugerrand: "Krugerrand",
  eagle: "Amerykański Orzeł",
};

export const VAULT_WEIGHT_ROWS = [
  { row: 1, label: "1 oz", fractionOz: 1 },
  { row: 2, label: "1/2 oz", fractionOz: 0.5 },
  { row: 3, label: "1/4 oz", fractionOz: 0.25 },
  { row: 4, label: "1/10 oz", fractionOz: 0.1 },
] as const;

export const VAULT_SERIES_COLUMNS: VaultCoinSeries[] = [
  "kangaroo",
  "britannia",
  "philharmonic",
  "maple",
  "krugerrand",
];

export function stockImageForSeries(series: VaultCoinSeries): string {
  return COIN_STOCK_IMAGES[series] ?? COIN_STOCK_IMAGES.kangaroo;
}
