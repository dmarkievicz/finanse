import type { AccountType } from "@/types/database";
import {
  inferPortfolioKindFromAccountName,
  isInvestmentLedgerAccount,
  type PortfolioKind,
} from "@/lib/investments/portfolio-kinds";

/** Konto księgowe złota z Excela — nie operacyjne; wartość w module Bulion (GOLD). */
export const GOLD_LEDGER_NAME_PATTERN = /\bzłoto\b|\bzlot\b/i;

/** Konto księgowe LEGO z Excela — nie bank; wartość w module Kolekcje (COLLECTIBLE). */
export const COLLECTIBLE_LEDGER_NAME_PATTERN = /^lego$/i;

export function isGoldLedgerAccount(name: string): boolean {
  return GOLD_LEDGER_NAME_PATTERN.test(name.trim());
}

export function isCollectibleLedgerAccount(name: string): boolean {
  return COLLECTIBLE_LEDGER_NAME_PATTERN.test(name.trim());
}

/** Złoto, LEGO lub ETF — pseudo-konta z importu, ukryte z widoku Kont. */
export function isAssetLedgerAccount(name: string): boolean {
  return isInvestmentLedgerAccount(name);
}

export { inferPortfolioKindFromAccountName, type PortfolioKind };

export const LIABILITY_ACCOUNT_TYPES = new Set<AccountType>(["loan", "credit_card"]);

export function isLiabilityAccountType(type: string): boolean {
  return LIABILITY_ACCOUNT_TYPES.has(type as AccountType);
}

export const CREDIT_CARD_NAME_PATTERN =
  /\bkarta\b|credit\s*card|visa|mastercard|amex|american\s*express/i;

export const LOAN_ACCOUNT_NAME_PATTERN = /pożyczone|hipoteczny/i;

export function isLoanLedgerAccount(name: string): boolean {
  return LOAN_ACCOUNT_NAME_PATTERN.test(name.trim());
}

export function inferAccountTypeFromName(name: string): AccountType {
  if (isLoanLedgerAccount(name)) return "loan";
  if (CREDIT_CARD_NAME_PATTERN.test(name)) return "credit_card";
  if (isAssetLedgerAccount(name)) return "other";
  if (/xtb|lokaty|obligacje|inwestycje|pzu|ikze|krypto|robo-doradca/i.test(name)) return "investment";
  if (/portfel|gotówka/i.test(name)) return "cash";
  if (/bank|mbank|ing|alior|revolut|millennium|nest|n26|bnp|agricole|velo|bph|bos|multibank/i.test(name)) {
    return "bank";
  }
  return "other";
}

/** Typ z bazy lub wywnioskowany z nazwy (gdy w DB jest „other”). */
export function resolveAccountType(
  accountType: AccountType,
  accountName: string
): AccountType {
  if (accountType !== "other") return accountType;
  const inferred = inferAccountTypeFromName(accountName);
  return inferred !== "other" ? inferred : accountType;
}
