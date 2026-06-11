import { ACCOUNT_CURRENCIES } from "@/lib/accounts/patch-fields";

export const TRANSACTION_CURRENCIES = ACCOUNT_CURRENCIES;

export function defaultExchangeRate(currency: string): number {
  return currency === "PLN" ? 1 : 1;
}

export function isPln(currency: string): boolean {
  return currency === "PLN";
}
