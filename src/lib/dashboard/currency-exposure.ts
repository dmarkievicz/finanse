import type { AccountBalance } from "@/types/database";

export interface CurrencyExposureRow {
  code: string;
  assetsPln: number;
  liabilitiesPln: number;
  sharePct: number;
  color: string;
}

export interface CurrencyExposureResult {
  rows: CurrencyExposureRow[];
  totalAssets: number;
  totalLiabilities: number;
  isValid: boolean;
  warning?: string;
}

const CURRENCY_COLORS: Record<string, string> = {
  PLN: "#1e3a5f",
  EUR: "#0d9488",
  USD: "#3b82f6",
  GBP: "#8b5cf6",
  CHF: "#f59e0b",
};

export function computeCurrencyExposure(
  balances: AccountBalance[]
): CurrencyExposureResult {
  const assets = new Map<string, number>();
  const liabilities = new Map<string, number>();

  for (const b of balances) {
    const code = b.currency || "PLN";
    const val = Number(b.balance_pln);
    if (val >= 0) {
      assets.set(code, (assets.get(code) ?? 0) + val);
    } else {
      liabilities.set(code, (liabilities.get(code) ?? 0) + Math.abs(val));
    }
  }

  const totalAssets = [...assets.values()].reduce((a, b) => a + b, 0);
  const totalLiabilities = [...liabilities.values()].reduce((a, b) => a + b, 0);

  if (totalAssets <= 0) {
    return {
      rows: [],
      totalAssets: 0,
      totalLiabilities,
      isValid: false,
      warning:
        totalLiabilities > 0
          ? "Brak dodatnich aktywów — udziałów walutowych nie można policzyć."
          : "Brak danych o ekspozycji walutowej.",
    };
  }

  const codes = [...new Set([...assets.keys(), ...liabilities.keys()])].sort(
    (a, b) => (assets.get(b) ?? 0) - (assets.get(a) ?? 0)
  );

  const rows: CurrencyExposureRow[] = codes.map((code) => {
    const assetsPln = assets.get(code) ?? 0;
    return {
      code,
      assetsPln,
      liabilitiesPln: liabilities.get(code) ?? 0,
      sharePct: assetsPln > 0 ? Math.round((assetsPln / totalAssets) * 1000) / 10 : 0,
      color: CURRENCY_COLORS[code] ?? "#64748b",
    };
  });

  const shareSum = rows.reduce((s, r) => s + r.sharePct, 0);
  const isValid = Math.abs(shareSum - 100) < 1.5 || rows.filter((r) => r.assetsPln > 0).length <= 1;

  return {
    rows: rows.filter((r) => r.assetsPln > 0 || r.liabilitiesPln > 0),
    totalAssets,
    totalLiabilities,
    isValid,
    warning: !isValid ? "Suma udziałów walutowych odbiega od 100% — sprawdź salda kont." : undefined,
  };
}
