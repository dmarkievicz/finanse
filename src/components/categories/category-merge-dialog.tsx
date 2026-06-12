"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";

interface CategoryMergeDialogProps {
  open: boolean;
  onClose: () => void;
  source: { id: string; name: string; txCount: number };
  categories: { id: string; name: string }[];
}

export function CategoryMergeDialog({
  open,
  onClose,
  source,
  categories,
}: CategoryMergeDialogProps) {
  const router = useRouter();
  const [targetId, setTargetId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const targets = categories.filter((c) => c.id !== source.id);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: source.id, target_id: targetId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd scalania");
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-slate-900">Scal kategorie</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            Transakcje z kategorii <strong>{source.name}</strong> ({source.txCount} transakcji)
            zostaną przeniesione do kategorii docelowej. Kategoria źródłowa zostanie zarchiwizowana.
          </p>
          <div>
            <label className="text-xs font-medium text-slate-500">Kategoria docelowa</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— wybierz —</option>
              {targets.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={loading || !targetId}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Scal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
