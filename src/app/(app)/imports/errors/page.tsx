import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { fetchImportErrorRows } from "@/lib/queries/imports";
import { formatDateTime } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ImportErrorsPage() {
  const supabase = await createClient();
  const rows = await fetchImportErrorRows(supabase, 200);

  return (
    <div>
      <PageHeader
        title="Błędy importu"
        description={`${rows.length} wierszy z problemami walidacji`}
      />
      <Link
        href="/imports"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do Importu
      </Link>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-slate-50/80 text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">Wiersz</th>
              <th className="px-4 py-3 font-medium">Błąd</th>
              <th className="px-4 py-3 font-medium">Transakcja</th>
              <th className="px-4 py-3 font-medium">Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-muted">
                  Brak wierszy z błędami walidacji
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-muted">{r.row_number ?? "—"}</td>
                  <td className="px-4 py-3">
                    {(r.validation_errors ?? []).map((e, i) => (
                      <p key={i} className="text-amber-800">
                        {e.code ? `${e.code}: ` : ""}
                        {e.message}
                      </p>
                    ))}
                  </td>
                  <td className="px-4 py-3">
                    {r.transaction_id ? (
                      <Link
                        href={`/transactions/${r.transaction_id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        Otwórz
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
