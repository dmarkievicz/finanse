import { formatDate } from "@/lib/format";
import type { ImportRecord } from "@/lib/queries/imports";
import { cn } from "@/lib/utils";

interface ImportHistoryProps {
  imports: ImportRecord[];
}

const statusStyles: Record<string, string> = {
  imported: "bg-emerald-50 text-emerald-700",
  staged: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  validated: "bg-blue-50 text-blue-700",
};

export function ImportHistory({ imports }: ImportHistoryProps) {
  if (imports.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted">
        Brak historii importów
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h3 className="font-semibold text-foreground">Historia importów</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80 text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">Data</th>
              <th className="px-4 py-2 font-medium">Plik</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 text-right font-medium">Wierszy</th>
              <th className="px-4 py-2 text-right font-medium">Zaimport.</th>
              <th className="px-4 py-2 text-right font-medium">Pominięte</th>
              <th className="px-4 py-2 text-right font-medium">Błędy</th>
            </tr>
          </thead>
          <tbody>
            {imports.map((imp) => (
              <tr key={imp.id} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                  {formatDate(imp.started_at.slice(0, 10))}
                </td>
                <td className="px-4 py-2.5 font-medium text-foreground">{imp.filename}</td>
                <td className="px-4 py-2.5">
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-xs font-medium",
                      statusStyles[imp.status] ?? "bg-slate-100 text-slate-600"
                    )}
                  >
                    {imp.status}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-muted">
                  {imp.total_rows.toLocaleString("pl-PL")}
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-emerald-600">
                  {imp.imported_rows.toLocaleString("pl-PL")}
                </td>
                <td className="px-4 py-2.5 text-right text-muted">
                  {imp.skipped_rows.toLocaleString("pl-PL")}
                </td>
                <td className="px-4 py-2.5 text-right text-red-600">
                  {imp.error_rows.toLocaleString("pl-PL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
