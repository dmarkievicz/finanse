"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { BudgetRow } from "@/lib/queries/budgets";
import { formatPln } from "@/lib/format";

interface BudgetsPanelProps {
  budgets: BudgetRow[];
  categories: { id: string; name: string }[];
  year: number;
  month: number;
}

export function BudgetsPanel({ budgets, categories, year, month }: BudgetsPanelProps) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addBudget(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: categoryId,
          year,
          month,
          limit_pln: Number(limit.replace(",", ".")),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setCategoryId("");
      setLimit("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(false);
    }
  }

  async function removeBudget(id: string) {
    await fetch(`/api/budgets?id=${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={addBudget} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="min-w-[180px] flex-1">
          <label className="text-xs font-medium">Kategoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          >
            <option value="">— wybierz —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-32">
          <label className="text-xs font-medium">Limit PLN</label>
          <input
            type="text"
            inputMode="decimal"
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Dodaj
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {budgets.length === 0 ? (
        <p className="text-sm text-muted">Brak budżetów na ten miesiąc.</p>
      ) : (
        <div className="space-y-3">
          {budgets.map((b) => (
            <div key={b.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/categories/${b.category_id}?month=${year}-${String(b.month).padStart(2, "0")}`}
                    className="font-medium hover:text-primary hover:underline"
                  >
                    {b.category_name}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {formatPln(b.spent_pln)} / {formatPln(b.limit_pln)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeBudget(b.id)}
                  className="text-muted hover:text-red-600"
                  title="Usuń budżet"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${b.overBudget ? "bg-red-500" : b.pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(b.pct, 100)}%` }}
                />
              </div>
              <p className={`mt-1 text-xs ${b.overBudget ? "text-red-600 font-medium" : "text-muted"}`}>
                {b.pct}% wykorzystania
                {b.overBudget && " · przekroczono limit"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
