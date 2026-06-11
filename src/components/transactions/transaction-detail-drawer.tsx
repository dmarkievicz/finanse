"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { TransactionDetail } from "@/lib/queries/transaction-detail";
import type { AuditLogRow } from "@/lib/queries/audit";
import { formatDate, formatDateTime, formatPlnSigned } from "@/lib/format";
import { cn } from "@/lib/utils";

const typeLabels: Record<string, string> = {
  income: "Przychód",
  expense: "Wydatek",
  transfer: "Transfer",
  exchange: "Przewalutowanie",
  adjustment: "Korekta",
};

type DetailPayload = TransactionDetail & { audit?: AuditLogRow[] };

interface TransactionDetailDrawerProps {
  transactionId: string | null;
  onClose: () => void;
}

export function TransactionDetailDrawer({
  transactionId,
  onClose,
}: TransactionDetailDrawerProps) {
  const router = useRouter();
  const [data, setData] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!transactionId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/transactions/${transactionId}/detail`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Błąd");
        setData(json as DetailPayload);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Błąd"))
      .finally(() => setLoading(false));
  }, [transactionId]);

  async function handleDelete() {
    if (!data || !confirm("Usunąć transakcję? (soft delete)")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transactions/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soft_delete: true }),
      });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Błąd");
      }
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDuplicate() {
    if (!data) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/transactions/${data.id}/duplicate`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Błąd");
      onClose();
      router.push(`/transactions/${j.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Błąd");
    } finally {
      setActionLoading(false);
    }
  }

  if (!transactionId) return null;

  const source = data?.entries.find((e) => e.amount_pln < 0);
  const target = data?.entries.find((e) => e.amount_pln > 0);
  const primary = source ?? target ?? data?.entries[0];

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden
      />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Szczegóły transakcji</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-slate-100"
            aria-label="Zamknij"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted" />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          {data && (
            <div className="space-y-5">
              <div>
                <p className="text-xs text-muted">Data</p>
                <p className="text-lg font-semibold">{formatDate(data.date)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted">Typ</p>
                  <p className="font-medium">{typeLabels[data.type] ?? data.type}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Źródło danych</p>
                  <p className="font-medium">{data.import_id ? "Import Excel" : "Ręczna"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Kategoria</p>
                  <p className="font-medium">{data.category_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted">Podkategoria</p>
                  <p className="font-medium">{data.subcategory_name ?? "—"}</p>
                </div>
              </div>

              {data.import_id && (
                <Link
                  href="/imports"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                >
                  <Upload className="h-4 w-4" />
                  Powiązany import
                </Link>
              )}

              {(source || target) && (
                <div className="rounded-lg bg-slate-50 p-3 text-sm">
                  {source && (
                    <p>
                      <span className="text-muted">Z: </span>
                      {source.account_name}
                    </p>
                  )}
                  {target && (
                    <p>
                      <span className="text-muted">Do: </span>
                      {target.account_name}
                    </p>
                  )}
                </div>
              )}

              {primary && (
                <div className="rounded-lg border border-border p-4">
                  <p className="text-xs text-muted">Kwota</p>
                  <p
                    className={cn(
                      "text-2xl font-bold tabular-nums",
                      data.type === "income"
                        ? "text-emerald-600"
                        : data.type === "expense"
                          ? "text-red-600"
                          : "text-foreground"
                    )}
                  >
                    {formatPlnSigned(primary.amount_pln)}
                  </p>
                  {primary.currency !== "PLN" && (
                    <p className="mt-1 text-sm text-muted">
                      {Math.abs(primary.amount)} {primary.currency} · kurs{" "}
                      {primary.exchange_rate}
                    </p>
                  )}
                </div>
              )}

              {(data.details || data.description) && (
                <div>
                  <p className="text-xs text-muted">Szczegóły</p>
                  <p className="text-sm">{data.details || data.description}</p>
                </div>
              )}

              {data.entries.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted">Wpisy księgowe</p>
                  <ul className="space-y-2 text-sm">
                    {data.entries.map((e) => (
                      <li
                        key={e.id}
                        className="flex justify-between rounded-lg bg-slate-50 px-3 py-2"
                      >
                        <span>{e.account_name}</span>
                        <span className="tabular-nums font-medium">
                          {formatPlnSigned(e.amount_pln)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {data.audit && data.audit.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted">Historia zmian</p>
                  <ul className="max-h-40 space-y-2 overflow-y-auto text-xs text-muted">
                    {data.audit.slice(0, 15).map((a) => (
                      <li key={a.id} className="rounded bg-slate-50 px-2 py-1.5">
                        <span className="font-medium text-foreground">{a.action}</span> ·{" "}
                        {a.table_name} · {formatDateTime(a.created_at)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {data && (
          <div className="space-y-2 border-t border-border p-4">
            <Link
              href={`/transactions/${data.id}`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Pencil className="h-4 w-4" />
              Edytuj
              <ExternalLink className="h-3.5 w-3.5 opacity-70" />
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDuplicate}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" />
                Duplikuj
              </button>
              <button
                type="button"
                disabled={actionLoading || data.is_opening_balance}
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Usuń
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
