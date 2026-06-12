"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

export function ReportsPanel() {
  const month = new Date().toISOString().slice(0, 7);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-medium">Raporty miesięczne</h2>
      <p className="mt-2 text-sm text-muted">
        Podsumowanie przychodów, wydatków i kategorii za bieżący miesiąc.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={`/api/reports/monthly?month=${month}&format=xlsx`}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Pobierz XLSX
        </a>
        <a
          href={`/api/reports/monthly?month=${month}&format=pdf`}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          <FileText className="h-4 w-4" />
          Pobierz PDF
        </a>
      </div>
    </div>
  );
}
