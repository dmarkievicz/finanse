"use client";

import { Download, FileArchive, FileJson, FileSpreadsheet, History } from "lucide-react";

export function ExportPanel() {
  const date = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Download className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-medium">Eksport danych</h2>
      </div>
      <p className="mt-2 text-sm text-muted">
        Kopia zapasowa przed czyszczeniem danych lub do audytu. Zawiera transakcje, konta,
        import_rows, audit_log, inwestycje i ustawienia.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/api/export?format=zip"
          download={`finanse-backup-${date}.zip`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <FileArchive className="h-4 w-4" />
          Pełny backup (ZIP)
        </a>
        <a
          href="/api/export?format=json"
          download={`finanse-backup-${date}.json`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <FileJson className="h-4 w-4" />
          JSON (jeden plik)
        </a>
        <a
          href="/api/export?format=csv"
          download={`finanse-transakcje-${date}.csv`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Transakcje (CSV)
        </a>
        <a
          href="/api/export?format=csv-audit"
          download={`finanse-audit-${date}.csv`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <History className="h-4 w-4" />
          Audit log (CSV)
        </a>
      </div>
    </div>
  );
}
