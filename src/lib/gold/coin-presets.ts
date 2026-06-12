export interface CoinPreset {
  id: string;
  label: string;
  weight_grams: number;
  purity: number;
  mint_hint?: string;
}

export const COIN_PRESETS: CoinPreset[] = [
  { id: "1oz", label: "1 uncja (31,1 g)", weight_grams: 31.1035, purity: 0.9999, mint_hint: "Krugerrand / Maple" },
  { id: "half-oz", label: "1/2 uncji", weight_grams: 15.5517, purity: 0.9999 },
  { id: "quarter-oz", label: "1/4 uncji", weight_grams: 7.7759, purity: 0.9999 },
  { id: "tenth-oz", label: "1/10 uncji", weight_grams: 3.1103, purity: 0.9999 },
  { id: "nbp-20", label: "Moneta NBP 20 zł", weight_grams: 6.45, purity: 0.9999, mint_hint: "NBP" },
  { id: "bar-100", label: "Sztabka 100 g", weight_grams: 100, purity: 0.999, mint_hint: "PAMP / Valcambi" },
  { id: "bar-50", label: "Sztabka 50 g", weight_grams: 50, purity: 0.999 },
  { id: "bar-20", label: "Sztabka 20 g", weight_grams: 20, purity: 0.999 },
];
