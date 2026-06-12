"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import type { CategoryType } from "@/types/database";

interface CategoryFormDialogProps {
  open: boolean;
  onClose: () => void;
  edit?: { id: string; name: string; type: CategoryType; color?: string | null };
}

export function CategoryFormDialog({ open, onClose, edit }: CategoryFormDialogProps) {
  const router = useRouter();
  const [name, setName] = useState(edit?.name ?? "");
  const [type, setType] = useState<CategoryType>(edit?.type ?? "expense");
  const [color, setColor] = useState(edit?.color ?? "#64748b");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = edit ? `/api/categories/${edit.id}` : "/api/categories";
      const res = await fetch(url, {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd zapisu");
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
          <h3 className="font-semibold text-slate-900">
            {edit ? "Edytuj kategorię" : "Nowa kategoria"}
          </h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div>
            <label className="text-xs font-medium text-slate-500">Nazwa</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Typ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CategoryType)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="expense">Wydatek</option>
              <option value="income">Przychód</option>
              <option value="both">Wydatki i przychody</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Kolor</label>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={color ?? "#64748b"}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-slate-200"
              />
              <span className="text-xs text-slate-400">{color}</span>
            </div>
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
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Zapisz
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
