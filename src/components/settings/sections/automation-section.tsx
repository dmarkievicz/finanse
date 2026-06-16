"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  SettingsGroup,
  SettingsPanel,
} from "@/components/settings/settings-ui";

interface RuleRow {
  id: string;
  pattern: string;
  category_id: string;
  priority: number;
  categories: { name: string } | null;
}

interface AutomationSectionProps {
  rules: RuleRow[];
  categories: { id: string; name: string }[];
}

export function AutomationSection({ rules, categories }: AutomationSectionProps) {
  const router = useRouter();
  const [pattern, setPattern] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);
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

  async function applyRules(onlyUncategorized: boolean) {
    setApplying(true);
    setApplyResult(null);
    setError(null);
    try {
      const res = await fetch("/api/categorization-rules/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ only_uncategorized: onlyUncategorized }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setApplyResult(`Zaktualizowano ${data.updated} z ${data.scanned} sprawdzonych transakcji.`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setApplying(false);
    }
  }

  return (
    <SettingsPanel
      title="Automatyzacja"
      description="Reguły przypisujące kategorie na podstawie wzorca w opisie transakcji."
    >
      <SettingsGroup
        title="Reguły auto-kategoryzacji"
        description="Działają przy dodawaniu, imporcie Excel i po ręcznym zastosowaniu do istniejących transakcji."
      >
        <div className="px-4 py-4">
          <form onSubmit={handleAdd} className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="rule-pattern" className="text-xs font-medium text-foreground">
                Wzorzec w opisie
              </label>
              <input
                id="rule-pattern"
                type="text"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="np. biedronka"
                required
                className={`${inputClass} mt-1.5 w-full`}
              />
            </div>
            <div className="w-full lg:w-44">
              <label htmlFor="rule-category" className="text-xs font-medium text-foreground">
                Kategoria
              </label>
              <select
                id="rule-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className={`${inputClass} mt-1.5 w-full`}
              >
                <option value="">Wybierz…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading} className={`${btnPrimary} w-full lg:w-auto`}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Dodaj regułę
            </button>
          </form>

          {rules.length > 0 ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={applying}
                  onClick={() => void applyRules(true)}
                  className={btnSecondary}
                >
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Zastosuj do bez kategorii
                </button>
                <button
                  type="button"
                  disabled={applying}
                  onClick={() => void applyRules(false)}
                  className={`${btnSecondary} text-muted`}
                >
                  Przepuść wszystkie reguły ponownie
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-xs text-muted">
                      <th className="pb-2 pr-4 font-medium">Wzorzec</th>
                      <th className="pb-2 pr-4 font-medium">Kategoria</th>
                      <th className="pb-2 font-medium w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {rules.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 pr-4">
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                            {r.pattern}
                          </code>
                        </td>
                        <td className="py-2.5 pr-4 text-foreground">
                          {r.categories?.name ?? "—"}
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => removeRule(r.id)}
                            className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
                            aria-label="Usuń regułę"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="mt-4 text-xs text-muted">
              Brak reguł. Dodaj pierwszą regułę, aby automatycznie przypisywać kategorie.
            </p>
          )}

          {applyResult && <p className="mt-3 text-xs text-emerald-700">{applyResult}</p>}
          {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
        </div>
      </SettingsGroup>
    </SettingsPanel>
  );
}
