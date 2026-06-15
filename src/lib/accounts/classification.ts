import type { AccountType } from "@/types/database";

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

/** Złoto lub LEGO — pseudo-konta z importu, ukryte z widoku Kont. */
export function isAssetLedgerAccount(name: string): boolean {
  return isGoldLedgerAccount(name) || isCollectibleLedgerAccount(name);
}

export const LIABILITY_ACCOUNT_TYPES = new Set<AccountType>(["loan", "credit_card"]);

export function isLiabilityAccountType(type: string): boolean {
  return LIABILITY_ACCOUNT_TYPES.has(type as AccountType);
}

export const CREDIT_CARD_NAME_PATTERN =
  /\bkarta\b|credit\s*card|visa|mastercard|amex|american\s*express/i;

export function inferAccountTypeFromName(name: string): AccountType {
  if (/pożyczone|hipoteczny/i.test(name)) return "loan";
  if (CREDIT_CARD_NAME_PATTERN.test(name)) return "credit_card";
  if (isAssetLedgerAccount(name)) return "other";
  if (/xtb|lokaty|obligacje|inwestycje|pzu|ikze|krypto|robo-doradca/i.test(name)) return "investment";
  if (/portfel|gotówka/i.test(name)) return "cash";
  if (/bank|mbank|ing|alior|revolut|millennium|nest|n26|bnp|agricole|velo|bph|bos|multibank/i.test(name)) {
    return "bank";
  }
  return "other";
}
