export function formatPln(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}%`;
}

export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(date);
}

export function greetingPl(hour: number): string {
  if (hour < 12) return "Dzień dobry";
  if (hour < 18) return "Cześć";
  return "Dobry wieczór";
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function monthRange(month: string): { from: string; to: string } | null {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const mon = Number(m[2]);
  const from = `${year}-${m[2]}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const to = `${year}-${m[2]}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export function formatMonthLabel(month: string): string {
  const m = month.match(/^(\d{4})-(\d{2})$/);
  if (!m) return month;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(d);
}

export function formatPlnSigned(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    signDisplay: "exceptZero",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrency(
  value: number | null | undefined,
  currency: string,
  options?: { signed?: boolean; maxFractionDigits?: number }
): string {
  if (value == null) return "—";
  const code = currency === "EURO" ? "EUR" : currency;
  try {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: code,
      signDisplay: options?.signed ? "exceptZero" : "auto",
      maximumFractionDigits: options?.maxFractionDigits ?? (code === "PLN" ? 0 : 2),
    }).format(value);
  } catch {
    return `${value.toLocaleString("pl-PL")} ${currency}`;
  }
}

export function formatForeignWithPln(
  nativeAmount: number,
  currency: string,
  plnAmount: number,
  options?: { signed?: boolean }
): string {
  if (currency === "PLN") {
    return options?.signed ? formatPlnSigned(nativeAmount) : formatPln(nativeAmount);
  }
  const native = formatCurrency(nativeAmount, currency, {
    signed: options?.signed,
    maxFractionDigits: 2,
  });
  const pln =
    options?.signed || nativeAmount < 0
      ? formatPlnSigned(plnAmount)
      : formatPln(Math.abs(plnAmount));
  return `${native} (${pln})`;
}

export function formatAccountBalance(
  balanceNative: number,
  currency: string,
  balancePln: number
): string {
  if (currency === "PLN") {
    return formatPln(balanceNative);
  }
  return formatForeignWithPln(balanceNative, currency, balancePln);
}
