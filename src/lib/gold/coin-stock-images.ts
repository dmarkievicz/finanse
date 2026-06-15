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

export function inferCoinSeriesFromName(name: string): VaultCoinSeries | null {
  const n = name.toLowerCase();
  if (n.includes("kangur")) return "kangaroo";
  if (n.includes("britannia")) return "britannia";
  if (n.includes("filharmonik")) return "philharmonic";
  if (n.includes("klonowy") || n.includes("maple")) return "maple";
  if (n.includes("krugerrand")) return "krugerrand";
  if (n.includes("orzeł") || n.includes("orzel") || n.includes("eagle")) return "eagle";
  return null;
}
