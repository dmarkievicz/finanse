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

export function formatPlnSigned(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    signDisplay: "exceptZero",
    maximumFractionDigits: 0,
  }).format(value);
}
