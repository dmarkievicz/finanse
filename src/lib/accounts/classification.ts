import type { AccountType } from "@/types/database";

/** Konta księgowe z nazwą złota — historia transferów; wartość w module Inwestycje (GOLD). */
export const GOLD_LEDGER_NAME_PATTERN = /\bzłoto\b|\bzlot\b/i;

export function isGoldLedgerAccount(name: string): boolean {
  return GOLD_LEDGER_NAME_PATTERN.test(name);
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
  if (isGoldLedgerAccount(name)) return "other";
  if (/xtb|lokaty|obligacje|inwestycje|pzu|ikze|krypto|robo-doradca/i.test(name)) return "investment";
  if (/portfel|gotówka/i.test(name)) return "cash";
  if (/bank|mbank|ing|alior|revolut|millennium|nest|n26|bnp|agricole|velo|bph|bos|lego|multibank/i.test(name)) {
    return "bank";
  }
  return "other";
}
