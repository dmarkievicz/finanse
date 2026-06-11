"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, Wand2 } from "lucide-react";

interface RuleRow {
  id: string;
  pattern: string;
  category_id: string;
  priority: number;
  categories: { name: string } | null;
}

interface CategorizationRulesFormProps {
  rules: RuleRow[];
  categories: { id: string; name: string }[];
}

export function CategorizationRulesForm({ rules, categories }: CategorizationRulesFormProps) {
  const router = useRouter();
  const [pattern, setPattern] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categorization-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pattern, category_id: categoryId, priority: 10 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setPattern("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  async function removeRule(id: string) {
    await fetch(`/api/categorization-rules?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Wand2 className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-medium">Reguły auto-kategoryzacji</h2>
      </div>
      <p className="mt-2 text-sm text-muted">
        Jeśli opis transakcji zawiera wzorzec (np. „biedronka”), przypisz kategorię przy ręcznym
        dodawaniu.
      </p>

      <form onSubmit={handleAdd} className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="Wzorzec w opisie"
          required
          className="min-w-[140px] flex-1 rounded-lg border border-border px-3 py-2 text-sm"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          required
          className="rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">Kategoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Dodaj
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {rules.length > 0 && (
        <ul className="mt-4 space-y-2 text-sm">
          {rules.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
            >
              <span>
                <code className="rounded bg-slate-100 px-1">{r.pattern}</code>
                <span className="mx-2 text-muted">→</span>
                {r.categories?.name ?? "—"}
              </span>
              <button
                type="button"
                onClick={() => removeRule(r.id)}
                className="text-muted hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
