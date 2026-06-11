import type { AuditLogRow } from "@/lib/queries/audit";

const TABLE_LABELS: Record<string, string> = {
  transactions: "Transakcja",
  transaction_entries: "Wpis księgowy",
  accounts: "Konto",
  categories: "Kategoria",
  subcategories: "Podkategoria",
  user_settings: "Ustawienia",
  budgets: "Budżet",
  categorization_rules: "Reguła kategoryzacji",
  goals: "Cel",
  instruments: "Instrument",
  investment_transactions: "Operacja inwestycyjna",
  imports: "Import",
  system: "System",
};

const ACTION_LABELS: Record<string, string> = {
  insert: "Utworzono",
  update: "Zmieniono",
  delete: "Usunięto",
};

const FIELD_LABELS: Record<string, string> = {
  date: "Data",
  type: "Typ",
  status: "Status",
  description: "Opis",
  details: "Szczegóły",
  category_id: "Kategoria",
  subcategory_id: "Podkategoria",
  amount: "Kwota",
  amount_pln: "Kwota PLN",
  currency: "Waluta",
  exchange_rate: "Kurs",
  account_id: "Konto",
  limit_pln: "Limit",
  analysis_start_date: "Data startu analiz",
  lifecycle_status: "Status konta",
  name: "Nazwa",
  deleted_at: "Usunięcie (soft)",
};

function formatValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (key === "deleted_at" && value) return "tak";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "tak" : "nie";
  const s = String(value);
  return s.length > 80 ? `${s.slice(0, 77)}…` : s;
}

function diffFields(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null
): string[] {
  if (!oldData && !newData) return [];
  if (rowIsSystemEvent(newData)) {
    const ev = newData?.event as string;
    const details = newData?.details as Record<string, unknown> | undefined;
    return [ev, details ? JSON.stringify(details) : ""].filter(Boolean);
  }

  const keys = new Set([...Object.keys(oldData ?? {}), ...Object.keys(newData ?? {})]);
  const skip = new Set(["id", "user_id", "created_at", "updated_at", "validation_issues"]);
  const lines: string[] = [];

  for (const key of keys) {
    if (skip.has(key)) continue;
    const oldV = oldData?.[key];
    const newV = newData?.[key];
    if (JSON.stringify(oldV) === JSON.stringify(newV)) continue;
    const label = FIELD_LABELS[key] ?? key;
    if (oldData && newData) {
      lines.push(`${label}: ${formatValue(key, oldV)} → ${formatValue(key, newV)}`);
    } else if (newData) {
      lines.push(`${label}: ${formatValue(key, newV)}`);
    } else {
      lines.push(`${label}: ${formatValue(key, oldV)}`);
    }
  }

  return lines;
}

function rowIsSystemEvent(newData: Record<string, unknown> | null): boolean {
  return newData != null && typeof newData.event === "string";
}

export function formatAuditRow(row: AuditLogRow): { title: string; details: string[] } {
  const table = TABLE_LABELS[row.table_name] ?? row.table_name;
  const action = ACTION_LABELS[row.action] ?? row.action;

  if (row.table_name === "system" && row.new_data) {
    const event = String((row.new_data as { event?: string }).event ?? "zdarzenie");
    const details = (row.new_data as { details?: Record<string, unknown> }).details;
    const lines: string[] = [];
    if (details && typeof details === "object") {
      for (const [k, v] of Object.entries(details)) {
        lines.push(`${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
      }
    }
    return { title: `System — ${event}`, details: lines };
  }

  const changes = diffFields(row.old_data, row.new_data);
  return {
    title: `${action} — ${table}`,
    details: changes.length ? changes : ["Brak szczegółów zmian w audycie"],
  };
}
