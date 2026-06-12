"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, RotateCcw } from "lucide-react";
import type { DeletedTransactionRow } from "@/lib/queries/deleted-transactions";
import { formatDate } from "@/lib/format";

const typeLabels: Record<string, string> = {
  expense: "Wydatek",
  income: "Przychód",
  transfer: "Transfer",
  exchange: "Wymiana",
  adjustment: "Korekta",
};

interface TransactionsTrashPanelProps {
  items: DeletedTransactionRow[];
  total: number;
  page: number;
  pageSize: number;
}

export function TransactionsTrashPanel({
  items,
  total,
  page,
  pageSize,
}: TransactionsTrashPanelProps) {
  const router = useRouter();
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function restore(id: string) {
    setRestoringId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Błąd przywracania");
      router.refresh();
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div>
      <Link
        href="/transactions"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Wróć do transakcji
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Kosz transakcji</h1>
        <p className="mt-1 text-sm text-muted">
          {total.toLocaleString("pl-PL")} usuniętych transakcji · możesz je przywrócić
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted">
          Kosz jest pusty.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="divide-y divide-border">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">{formatDate(item.date)}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-muted">
                      {typeLabels[item.type] ?? item.type}
                    </span>
                    {item.category_name && (
                      <span className="text-muted">{item.category_name}</span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-sm text-foreground">
                    {item.details || item.description || "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Usunięto {formatDate(item.deleted_at.slice(0, 10))}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">{item.amount_label}</span>
                  <button
                    type="button"
                    onClick={() => void restore(item.id)}
                    disabled={restoringId === item.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-50"
                  >
                    {restoringId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Przywróć
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted">
            <span>
              Strona {page} z {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/transactions/trash?page=${page - 1}`}
                  className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-slate-50"
                >
                  ← Poprzednia
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/transactions/trash?page=${page + 1}`}
                  className="rounded-lg border border-border px-3 py-1.5 font-medium hover:bg-slate-50"
                >
                  Następna →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
