/** Odczyt pól z surowego wiersza Excela (import_rows.raw_data). */

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function getField(raw: Record<string, unknown>, ...names: string[]) {
  for (const [key, val] of Object.entries(raw)) {
    const nk = normalizeKey(key);
    for (const name of names) {
      if (nk === normalizeKey(name)) return val ?? "";
    }
  }
  return "";
}

export interface ImportRowHint {
  amount: number | null;
  amountPln: number | null;
  currency: string;
  exchangeRate: number;
  sourceAccount: string;
  targetAccount: string;
  reviewMessage: string | null;
}

export function hintFromImportRaw(
  raw: Record<string, unknown> | null,
  validationErrors: { code?: string; message?: string }[] | null
): ImportRowHint | null {
  if (!raw) return null;

  const amountRaw = Number(getField(raw, "amount", " Amount "));
  const rate = Number(getField(raw, "exchange rate", " Exchange Rate ")) || 1;
  const currencyRaw = String(
    getField(raw, "currency of amount", "currency") || ""
  )
    .trim()
    .toUpperCase();
  const currency = !currencyRaw
    ? "PLN"
    : currencyRaw === "EURO" || currencyRaw === "EUR"
      ? "EUR"
      : currencyRaw;
  const source = String(getField(raw, "source account") || "").trim();
  const target = String(getField(raw, "target account") || "").trim();

  const amount = Number.isFinite(amountRaw) ? amountRaw : null;
  const typeLower = String(getField(raw, "type")).trim().toLowerCase();
  const amountPln =
    amount != null && amount !== 0
      ? (() => {
          const abs = Math.round(Math.abs(amount) * 100) / 100;
          const pln =
            currency === "PLN"
              ? abs
              : Math.round(Math.abs(amount) * rate * 100) / 100;
          if (typeLower === "expenses" || typeLower === "expense") {
            return amount > 0 ? -pln : pln;
          }
          if (typeLower === "income") {
            return amount < 0 ? -pln : pln;
          }
          return pln;
        })()
      : null;

  const firstIssue = validationErrors?.[0]?.message ?? null;

  return {
    amount,
    amountPln,
    currency,
    exchangeRate: rate,
    sourceAccount: source,
    targetAccount: target,
    reviewMessage: firstIssue,
  };
}

export function formatPendingAccountLabel(
  type: string,
  hint: ImportRowHint
): string {
  if (type === "transfer") {
    if (hint.sourceAccount && hint.targetAccount) {
      return `${hint.sourceAccount} → ${hint.targetAccount}`;
    }
    if (hint.targetAccount) return `→ ${hint.targetAccount} (brak źródła)`;
    if (hint.sourceAccount) return `${hint.sourceAccount} → (brak celu)`;
  }
  if (type === "income" && hint.targetAccount) return hint.targetAccount;
  if (type === "expense" && hint.sourceAccount) return hint.sourceAccount;
  return "— (brak konta w Excelu)";
}
