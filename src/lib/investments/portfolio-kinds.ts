import {
  isCollectibleLedgerAccount,
  isGoldLedgerAccount,
} from "@/lib/accounts/classification";

export type PortfolioKind = "gold" | "lego" | "etf";

export const PORTFOLIO_KIND_LABELS: Record<PortfolioKind, string> = {
  gold: "Złoto",
  lego: "LEGO",
  etf: "ETF",
};

const ETF_LEDGER_PATTERN = /^etf$/i;

export function isEtfLedgerAccount(name: string): boolean {
  return ETF_LEDGER_PATTERN.test(name.trim());
}

/** Pseudo-konta inwestycyjne — ukryte z widoku Kont, widoczne w module Inwestycje. */
export function isInvestmentLedgerAccount(name: string): boolean {
  return (
    isGoldLedgerAccount(name) ||
    isCollectibleLedgerAccount(name) ||
    isEtfLedgerAccount(name)
  );
}

export function inferPortfolioKindFromAccountName(name: string): PortfolioKind | null {
  if (isGoldLedgerAccount(name)) return "gold";
  if (isCollectibleLedgerAccount(name)) return "lego";
  if (isEtfLedgerAccount(name)) return "etf";
  return null;
}

export const PORTFOLIO_LEDGER_CANONICAL_NAMES: Record<PortfolioKind, string[]> = {
  gold: ["ZŁOTO"],
  lego: ["LEGO"],
  etf: ["ETF"],
};
