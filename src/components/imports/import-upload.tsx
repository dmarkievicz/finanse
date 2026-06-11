"use client";

import { Terminal } from "lucide-react";

export function ImportUpload() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Terminal className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Import z Excela (lokalnie)</h3>
      </div>
      <p className="mt-2 text-sm text-muted">
        Import przez przeglądarkę jest wyłączony — wymagałby klucza service role na serwerze.
        Uruchom import lokalnie w katalogu projektu:
      </p>

      <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-sm text-slate-100">
        npm run import:excel
      </pre>

      <p className="mt-3 text-xs text-muted">
        Plik <code className="rounded bg-slate-100 px-1">.xlsx</code> umieść w{" "}
        <code className="rounded bg-slate-100 px-1">data/raw/</code>. Po imporcie: Zarządzaj kontami
        → Salda początkowe → Transakcje do poprawy.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-muted">npm run verify:balances</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-muted">
          npm run reconcile:balances
        </span>
      </div>
    </div>
  );
}
