"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Archive, CheckCircle2, EyeOff, Loader2, ArrowRight } from "lucide-react";
import type { AccountManageRow } from "@/types/database";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import type { AccountType } from "@/types/database";
import { formatAccountBalance } from "@/lib/format";
import { cn } from "@/lib/utils";

interface AccountsManageTableProps {
  accounts: AccountManageRow[];
}

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-amber-50 text-amber-700",
  archived: "bg-slate-100 text-slate-600",
};

const statusLabels = {
  active: "Aktywne",
  inactive: "Nieaktywne",
  archived: "Archiwalne",
};

export function AccountsManageTable({ accounts }: AccountsManageTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === accounts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(accounts.map((a) => a.account_id)));
    }
  }

  async function bulkAction(action: "activate" | "archive" | "hide_dashboard") {
    if (!selected.size) return;
    setLoading(action);
    setError(null);
    try {
      const res = await fetch("/api/accounts", {
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
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!selected.size || loading !== null}
          onClick={() => bulkAction("activate")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === "activate" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Aktywuj zaznaczone ({selected.size})
        </button>
        <button
          type="button"
          disabled={!selected.size || loading !== null}
          onClick={() => bulkAction("archive")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {loading === "archive" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
          Archiwizuj
        </button>
        <button
          type="button"
          disabled={!selected.size || loading !== null}
          onClick={() => bulkAction("hide_dashboard")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {loading === "hide_dashboard" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
          Ukryj z pulpitu
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
                    checked={selected.size === accounts.length && accounts.length > 0}
                    onChange={toggleAll}
                    aria-label="Zaznacz wszystkie"
                  />
                </th>
                <th className="px-4 py-3 font-medium">Konto</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Typ</th>
                <th className="px-4 py-3 font-medium">Transakcje</th>
                <th className="px-4 py-3 text-right font-medium">Saldo (PLN)</th>
                <th className="px-4 py-3 font-medium">Pulpit</th>
                <th className="px-4 py-3 font-medium">Majątek</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr
                  key={a.account_id}
                  className={cn(
                    "border-b border-border/60 last:border-0 hover:bg-slate-50/50",
                    a.needs_review && "bg-amber-50/40"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(a.account_id)}
                      onChange={() => toggle(a.account_id)}
                      aria-label={`Zaznacz ${a.account_name}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{a.account_name}</div>
                    {a.needs_review && (
                      <span className="text-xs text-amber-700">Do uporządkowania</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 text-xs font-medium",
                        statusStyles[a.lifecycle_status]
                      )}
                    >
                      {statusLabels[a.lifecycle_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {ACCOUNT_TYPE_LABELS[a.account_type as AccountType] ?? a.account_type}
                  </td>
                  <td className="px-4 py-3 text-muted">{a.tx_count}</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatAccountBalance(a.balance_native, a.currency, a.balance)}
                  </td>
                  <td className="px-4 py-3 text-muted">{a.show_on_dashboard ? "Tak" : "Nie"}</td>
                  <td className="px-4 py-3 text-muted">
                    {a.include_in_net_worth ? "Tak" : "Nie"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <Link
                        href={`/accounts/${a.account_id}`}
                        className="text-xs font-medium text-accent hover:underline"
                      >
                        Edytuj
                      </Link>
                      <Link
                        href={`/transactions?account=${a.account_id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-accent hover:underline"
                      >
                        Historia
                        <ArrowRight className="h-3 w-3" />
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
