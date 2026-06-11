"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Loader2, Trash2 } from "lucide-react";

export function ClearDataPanel() {
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [backupAck, setBackupAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const date = new Date().toISOString().slice(0, 10);

  async function handleClear() {
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/import/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm, backup_acknowledged: backupAck }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd czyszczenia");

      setMessage(
        `Usunięto: ${data.deleted.transactions} transakcji, ${data.deleted.accounts} kont, ${data.deleted.imports} importów.`
      );
      setConfirm("");
      setBackupAck(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-5">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900">Wyczyść wszystkie dane</h3>
          <p className="mt-1 text-sm text-red-800/80">
            Usuwa transakcje, konta, kategorie i historię importów. Nieodwracalne. Przed operacją
            pobierz backup ZIP.
          </p>

          <a
            href="/api/export?format=zip"
            download={`finanse-backup-${date}.zip`}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-50"
          >
            <Download className="h-4 w-4" />
            Pobierz backup ZIP
          </a>

          <label className="mt-4 flex cursor-pointer items-start gap-2 text-sm text-red-900">
            <input
              type="checkbox"
              checked={backupAck}
              onChange={(e) => setBackupAck(e.target.checked)}
              className="mt-1"
              disabled={loading}
            />
            <span>Pobrałem kopię zapasową (ZIP lub JSON) przed czyszczeniem</span>
          </label>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="text-xs font-medium text-red-900">
                Wpisz <strong>WYCZYŚĆ</strong> aby potwierdzić
              </label>
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm"
                placeholder="WYCZYŚĆ"
                disabled={loading}
              />
            </div>
            <button
              type="button"
              onClick={handleClear}
              disabled={loading || confirm !== "WYCZYŚĆ" || !backupAck}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Wyczyść dane
            </button>
          </div>
          {message && <p className="mt-3 text-sm font-medium text-emerald-700">{message}</p>}
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        </div>
      </div>
    </div>
  );
}
