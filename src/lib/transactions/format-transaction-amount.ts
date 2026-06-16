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
    t.originalAmount ?? (t.pendingAmount != null ? t.pendingAmount : null);
  const currency = (t.currency ?? t.pendingCurrency ?? "PLN").toUpperCase();
  const plnAbs = Math.abs(displayAmount);

  if (currency !== "PLN" && originalAmount != null && originalAmount !== 0) {
    if (t.type === "transfer" || t.type === "exchange") {
      return formatForeignWithPln(Math.abs(originalAmount), currency, plnAbs);
    }
    return formatForeignWithPln(originalAmount, currency, displayAmount, {
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
    t.originalAmount ?? (t.pendingAmount != null ? t.pendingAmount : null);
  if (originalAmount == null) return "—";
  const currency = (t.currency ?? t.pendingCurrency ?? "PLN").toUpperCase();
  const signed = t.type === "income" || t.type === "expense";
  if (currency === "PLN") {
    return originalAmount.toLocaleString("pl-PL", {
      signDisplay: signed ? "exceptZero" : "auto",
    });
  }
  return formatCurrency(originalAmount, currency, {
    signed,
    maxFractionDigits: 2,
  });
}
