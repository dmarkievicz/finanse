"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Terminal,
  Upload,
  X,
} from "lucide-react";
import { btnPrimary, btnSecondary } from "@/components/layout/buttons";
import { cn } from "@/lib/utils";
import type { ImportPreview } from "@/lib/import/engine";
import type { ImportReport } from "@/lib/import/engine";

type Phase = "idle" | "previewing" | "preview" | "importing" | "done";

export function ImportUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setReport(null);
    setForce(false);
    setError(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  async function analyze(selected: File) {
    setError(null);
    setReport(null);
    setFile(selected);
    setPhase("previewing");

    const form = new FormData();
    form.append("file", selected);

    try {
      const res = await fetch("/api/import/preview", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd podglądu");
      setPreview(data as ImportPreview);
      setPhase("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd podglądu");
      setPhase("idle");
      setFile(null);
    }
  }

  function handleFileSelect(selected: File | null) {
    if (!selected) return;
    if (!selected.name.match(/\.xlsx?$/i)) {
      setError("Dozwolony format: plik .xlsx");
      return;
    }
    void analyze(selected);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  async function handleImport() {
    if (!file || !preview) return;
    if (preview.over_limit) return;

    setPhase("importing");
    setError(null);

    const form = new FormData();
    form.append("file", file);
    if (force) form.append("force", "true");

    try {
      const res = await fetch("/api/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd importu");
      setReport(data as ImportReport);
      setPhase("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd importu");
      setPhase("preview");
    }
  }

  const canImport =
    preview &&
    !preview.over_limit &&
    preview.importable > 0 &&
    (!preview.already_imported || force);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-gradient-to-r from-slate-50 to-white px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Import z Excela</h2>
              <p className="mt-0.5 text-sm text-muted">
                Prześlij arkusz transakcji — do {preview?.max_rows ?? 1000} wierszy na import przez
                aplikację.
              </p>
            </div>
          </div>
          {phase !== "idle" && phase !== "previewing" && (
            <button type="button" onClick={reset} className={cn(btnSecondary, "text-xs")}>
              Nowy plik
            </button>
          )}
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-6">
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {(phase === "idle" || phase === "previewing") && (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-slate-200 bg-slate-50/50 hover:border-primary/40 hover:bg-slate-50"
            )}
          >
            {phase === "previewing" ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-3 text-sm font-medium text-foreground">Analizuję plik…</p>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="mt-4 text-sm font-medium text-foreground">
                  Przeciągnij plik .xlsx lub kliknij, aby wybrać
                </p>
                <p className="mt-1 text-xs text-muted">Maks. 1000 wierszy · do 5 MB</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
            />
          </div>
        )}

        {file && preview && (phase === "preview" || phase === "importing" || phase === "done") && (
          <div className="space-y-5">
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-slate-50/80 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted">
                    {(file.size / 1024).toFixed(0)} KB · {preview.total_rows} wierszy
                  </p>
                </div>
              </div>
              {phase === "preview" && (
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 rounded-md p-1 text-muted hover:bg-slate-200 hover:text-foreground"
                  aria-label="Usuń plik"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {preview.over_limit && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Plik ma {preview.total_rows} wierszy — limit aplikacji to {preview.max_rows}. Do
                większych importów użyj narzędzia CLI poniżej.
              </div>
            )}

            {preview.already_imported && phase !== "done" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <p>Ten plik był już importowany (ten sam hash).</p>
                <label className="mt-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                    className="rounded border-amber-400"
                  />
                  Wymuś ponowny import
                </label>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <PreviewStat label="Do zapisu" value={preview.importable} tone="positive" />
              <PreviewStat label="Błędy walidacji" value={preview.errors} tone="negative" />
              <PreviewStat label="Do sprawdzenia" value={preview.needs_review} tone="warning" />
              <PreviewStat
                label="Duplikaty w pliku"
                value={preview.duplicates_in_file}
                tone="neutral"
              />
            </div>

            {(preview.accounts.length > 0 || preview.categories.length > 0) && phase === "preview" && (
              <div className="grid gap-4 sm:grid-cols-2">
                {preview.accounts.length > 0 && (
                  <MetaList title="Konta do utworzenia / użycia" items={preview.accounts} />
                )}
                {preview.categories.length > 0 && (
                  <MetaList title="Kategorie" items={preview.categories} />
                )}
              </div>
            )}

            {phase === "done" && report && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-semibold">Import zakończony</span>
                </div>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <ResultItem label="Zaimportowano" value={report.imported} />
                  <ResultItem label="Pominięte (duplikaty)" value={report.skipped_duplicates} />
                  <ResultItem label="Błędy" value={report.errors} />
                  <ResultItem label="Do sprawdzenia" value={report.needs_review} />
                </dl>
              </div>
            )}

            {phase === "preview" && (
              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                <button
                  type="button"
                  disabled={!canImport}
                  onClick={() => void handleImport()}
                  className={cn(btnPrimary, "disabled:cursor-not-allowed disabled:opacity-50")}
                >
                  Importuj {preview.importable} transakcji
                </button>
                <button type="button" onClick={reset} className={btnSecondary}>
                  Anuluj
                </button>
              </div>
            )}

            {phase === "importing" && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
                Zapisuję transakcje…
              </div>
            )}
          </div>
        )}

        <CliImportHint />
      </div>
    </section>
  );
}

function PreviewStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "positive" | "negative" | "warning" | "neutral";
}) {
  const tones = {
    positive: "border-emerald-100 bg-emerald-50/60",
    negative: "border-red-100 bg-red-50/60",
    warning: "border-amber-100 bg-amber-50/60",
    neutral: "border-border bg-slate-50/60",
  };
  const values = {
    positive: "text-emerald-700",
    negative: "text-red-700",
    warning: "text-amber-800",
    neutral: "text-foreground",
  };

  return (
    <div className={cn("rounded-lg border px-4 py-3", tones[tone])}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className={cn("mt-1 text-2xl font-semibold tabular-nums", values[tone])}>{value}</p>
    </div>
  );
}

function MetaList({ title, items }: { title: string; items: string[] }) {
  const shown = items.slice(0, 8);
  const rest = items.length - shown.length;

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{title}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((item) => (
          <li
            key={item}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-foreground"
          >
            {item}
          </li>
        ))}
        {rest > 0 && (
          <li className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-muted">
            +{rest} więcej
          </li>
        )}
      </ul>
    </div>
  );
}

function ResultItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold tabular-nums text-emerald-900">{value}</dd>
    </div>
  );
}

function CliImportHint() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-medium text-muted hover:text-foreground"
      >
        <Terminal className="h-4 w-4" />
        Import dużych plików (CLI, bez limitu wierszy)
        <span className="ml-auto text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-slate-200 px-4 pb-4 pt-3 text-sm text-muted">
          <p>Umieść plik w <code className="rounded bg-white px-1">data/raw/</code> i uruchom:</p>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-sm text-slate-100">
            npm run import:excel
          </pre>
          <p className="mt-2 text-xs">
            Po imporcie: Zarządzaj kontami → Salda początkowe → Transakcje do poprawy.
          </p>
        </div>
      )}
    </div>
  );
}
