import { History } from "lucide-react";
import type { AuditLogRow } from "@/lib/queries/audit";
import { formatAuditRow } from "@/lib/audit/format-audit";
import { formatDateTime } from "@/lib/format";

interface AuditHistoryProps {
  rows: AuditLogRow[];
  title?: string;
  emptyMessage?: string;
}

export function AuditHistory({
  rows,
  title = "Historia zmian",
  emptyMessage = "Brak zapisanych zmian (audyt działa od wdrożenia migracji 11).",
}: AuditHistoryProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-muted" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 max-h-80 space-y-3 overflow-y-auto">
          {rows.map((row) => {
            const { title: rowTitle, details } = formatAuditRow(row);
            return (
              <li key={row.id} className="border-b border-border/60 pb-3 last:border-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium text-foreground">{rowTitle}</span>
                  <time className="text-xs text-muted">{formatDateTime(row.created_at)}</time>
                </div>
                <ul className="mt-1 space-y-0.5 text-xs text-muted">
                  {details.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
