"use client";

import { useMemo, useState } from "react";
import type { AuditLogRow } from "@/lib/queries/audit";
import { formatAuditRow } from "@/lib/audit/format-audit";
import { formatDateTime } from "@/lib/format";
import { inputClass, SettingsPanel } from "@/components/settings/settings-ui";

const ACTION_OPTIONS = [
  { value: "all", label: "Wszystkie typy" },
  { value: "insert", label: "Utworzono" },
  { value: "update", label: "Zmieniono" },
  { value: "delete", label: "Usunięto" },
];

const LIMIT_OPTIONS = [20, 50, 100] as const;

const TABLE_LABELS: Record<string, string> = {
  transactions: "Transakcja",
  transaction_entries: "Wpis księgowy",
  accounts: "Konto",
  categories: "Kategoria",
  system: "System",
};

interface AuditLogTableProps {
  rows: AuditLogRow[];
  emptyMessage?: string;
}

export function AuditLogTable({
  rows,
  emptyMessage = "Brak wpisów audytu. Po migracji 11 nowe zmiany będą zapisywane automatycznie.",
}: AuditLogTableProps) {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [limit, setLimit] = useState<(typeof LIMIT_OPTIONS)[number]>(50);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((row) => actionFilter === "all" || row.action === actionFilter)
      .filter((row) => {
        if (!q) return true;
        const { title, details } = formatAuditRow(row);
        const haystack = [title, ...details, row.table_name, row.record_id].join(" ").toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, limit);
  }, [rows, search, actionFilter, limit]);

  return (
    <SettingsPanel
      title="Audit log"
      description="Historia ostatnich operacji wykonanych w aplikacji."
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Szukaj…"
          className={`${inputClass} flex-1`}
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className={`${inputClass} sm:w-40`}
        >
          {ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value) as (typeof LIMIT_OPTIONS)[number])}
          className={`${inputClass} sm:w-32`}
        >
          {LIMIT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              Ostatnie {n}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">{emptyMessage}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/80">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-slate-50/80 text-xs text-muted">
                <th className="px-3 py-2.5 font-medium">Data</th>
                <th className="px-3 py-2.5 font-medium">Typ</th>
                <th className="px-3 py-2.5 font-medium">Obiekt</th>
                <th className="px-3 py-2.5 font-medium">Szczegóły</th>
                <th className="px-3 py-2.5 font-medium">ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50 bg-card">
              {filtered.map((row) => {
                const { title, details } = formatAuditRow(row);
                const objectLabel = TABLE_LABELS[row.table_name] ?? row.table_name;
                return (
                  <tr key={row.id} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-muted">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="px-3 py-2.5 text-sm font-medium text-foreground">{title}</td>
                    <td className="px-3 py-2.5 text-sm text-foreground">{objectLabel}</td>
                    <td className="max-w-xs px-3 py-2.5 text-xs leading-relaxed text-muted">
                      {details.length > 0 ? details.join(" · ") : "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[10px] text-muted">
                      {row.record_id.slice(0, 8)}…
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Wyświetlono {filtered.length} z {rows.length} pobranych wpisów.
        </p>
      )}
    </SettingsPanel>
  );
}
