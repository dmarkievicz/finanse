"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import type { TransactionListItem } from "@/lib/queries/transactions";
import { formatDate, formatPlnSigned } from "@/lib/format";

interface ReviewQueueProps {
  items: TransactionListItem[];
  categories: { id: string; name: string }[];
}

export function ReviewQueue({ items, categories }: ReviewQueueProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [categoryEdits, setCategoryEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState<"confirm" | "skip" | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleAll() {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((t) => t.id)));
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirmOne(id: string) {
    setLoading(id);
    setError(null);
    try {
      const catId = categoryEdits[id];
      if (catId) {
        const patchRes = await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_id: catId || null, status: "confirmed" }),
        });
        if (!patchRes.ok) {
          const d = await patchRes.json();
          throw new Error(d.error ?? "Błąd");
        }
      } else {
        const res = await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "confirmed" }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Błąd");
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(null);
    }
  }

  async function batchAction(action: "confirm" | "skip") {
    if (!selected.size) return;

    if (
      action === "skip" &&
      !confirm(
        `Oznaczyć ${selected.size} transakcji jako „nie poprawiaj”? Zostaną w historii bez zmian danych.`
      )
    ) {
      return;
    }

    setBatchLoading(action);
    setError(null);
    try {
      if (action === "confirm") {
        for (const id of selected) {
          const catId = categoryEdits[id];
          if (catId) {
            await fetch(`/api/transactions/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ category_id: catId }),
            });
          }
        }
      }

      const res = await fetch("/api/transactions/confirm-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setBatchLoading(null);
    }
  }

  async function skipOne(id: string) {
    setLoading(id);
    setError(null);
    try {
      const res = await fetch("/api/transactions/confirm-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id], action: "skip" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setLoading(null);
    }
  }

  if (!items.length) {
    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="mt-3 font-medium text-foreground">Brak transakcji do poprawy</p>
        <p className="mt-1 text-sm text-muted">Wszystkie pozycje zostały potwierdzone.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Zaznacz transakcje archiwalne (np. bez konta źródłowego/docelowego) i użyj{" "}
        <strong>Nie poprawiaj</strong> — znikną z tej listy bez zmiany danych. Użyj{" "}
        <strong>Potwierdź</strong>, gdy ręcznie poprawisz kategorię lub dane.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!selected.size || batchLoading !== null}
          onClick={() => batchAction("confirm")}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {batchLoading === "confirm" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Potwierdź zaznaczone ({selected.size})
        </button>
        <button
          type="button"
          disabled={!selected.size || batchLoading !== null}
          onClick={() => batchAction("skip")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-card px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {batchLoading === "skip" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          Nie poprawiaj — zostaw jak jest ({selected.size})
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50/80 text-left text-xs text-muted">
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={toggleAll}
                    aria-label="Zaznacz wszystkie"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Konto</th>
                <th className="px-4 py-3 font-medium">Szczegóły</th>
                <th className="px-4 py-3 font-medium">Kategoria</th>
                <th className="px-4 py-3 text-right font-medium">PLN</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-border/60 bg-red-50/30 last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggle(t.id)}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-muted">{t.accountLabel}</td>
                  <td className="max-w-[180px] truncate px-4 py-3" title={t.details ?? ""}>
                    {t.details || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={categoryEdits[t.id] ?? ""}
                      onChange={(e) =>
                        setCategoryEdits((prev) => ({ ...prev, [t.id]: e.target.value }))
                      }
                      className="max-w-[160px] rounded border border-border px-2 py-1 text-xs"
                    >
                      <option value="">{t.category ?? "— wybierz —"}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPlnSigned(t.amountPln)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => confirmOne(t.id)}
                        className="text-xs font-medium text-emerald-700 hover:underline disabled:opacity-50"
                        title="Potwierdź po poprawce"
                      >
                        {loading === t.id ? "…" : "OK"}
                      </button>
                      <button
                        type="button"
                        disabled={loading !== null}
                        onClick={() => skipOne(t.id)}
                        className="text-xs font-medium text-slate-600 hover:underline disabled:opacity-50"
                        title="Nie poprawiaj — zostaw w historii"
                      >
                        Pomiń
                      </button>
                      <Link
                        href={`/transactions/${t.id}`}
                        className="text-muted hover:text-foreground"
                        title="Szczegóły"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
