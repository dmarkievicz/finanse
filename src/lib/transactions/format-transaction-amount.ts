import type { TransactionListItem } from "@/lib/queries/transactions";
import {
  formatCurrency,
  formatForeignWithPln,
  formatPln,
  formatPlnSigned,
} from "@/lib/format";

export function formatTransactionPlnCell(t: TransactionListItem): string {
  const displayAmount = t.amountPln ?? t.pendingAmountPln;
  if (displayAmount == null) return "—";

  const originalAmount =
    t.originalAmount ?? (t.pendingAmount != null ? Math.abs(t.pendingAmount) : null);
  const currency = (t.currency ?? t.pendingCurrency ?? "PLN").toUpperCase();
  const plnAbs = Math.abs(displayAmount);

  if (currency !== "PLN" && originalAmount != null && originalAmount > 0) {
    if (t.type === "transfer" || t.type === "exchange") {
      return formatForeignWithPln(originalAmount, currency, plnAbs);
    }
    const signed = displayAmount < 0 ? -originalAmount : originalAmount;
    return formatForeignWithPln(Math.abs(signed), currency, plnAbs, {
      signed: t.type === "income" || t.type === "expense",
    });
  }

  if (t.type === "transfer" || t.type === "exchange") {
    return formatPln(plnAbs);
  }

  return formatPlnSigned(displayAmount);
}

export function formatTransactionAmountCell(t: TransactionListItem): string {
  const originalAmount =
    t.originalAmount ?? (t.pendingAmount != null ? Math.abs(t.pendingAmount) : null);
  if (originalAmount == null) return "—";
  const currency = (t.currency ?? t.pendingCurrency ?? "PLN").toUpperCase();
  if (currency === "PLN") {
    return originalAmount.toLocaleString("pl-PL");
  }
  return formatCurrency(originalAmount, currency, { maxFractionDigits: 2 });
}
