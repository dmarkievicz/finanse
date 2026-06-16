/** Filtr cashflow jak pivot Excela — pomija wiersze bez „Currency of Amount”. */

function normalizeKey(key: string) {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function getRawField(raw: Record<string, unknown>, ...names: string[]) {
  for (const [key, val] of Object.entries(raw)) {
    const nk = normalizeKey(key);
    for (const name of names) {
      if (nk === normalizeKey(name)) return val ?? "";
    }
  }
  return "";
}

/** Surowa wartość kolumny Currency of Amount (bez domyślnego PLN). */
export function importRawCurrencyOfAmount(raw: Record<string, unknown> | null): string {
  if (!raw) return "";
  return String(getRawField(raw, "currency of amount", "Currency of Amount")).trim();
}

/**
 * Pivot Excela nie liczy wierszy z pustą walutą kwoty (np. IKEA maj 2026).
 * Transakcje bez import_rows (ręczne) pozostają w cashflow.
 */
export function isExcludedFromExcelCashflow(raw: Record<string, unknown> | null | undefined): boolean {
  if (!raw || typeof raw !== "object") return false;
  return importRawCurrencyOfAmount(raw) === "";
}
