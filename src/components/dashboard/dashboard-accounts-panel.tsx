"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DashboardAccountRow } from "@/lib/queries/dashboard";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  bank: "Bank",
  cash: "Gotówka",
  broker: "Broker",
  deposit: "Lokata",
  loan: "Zobowiązanie",
  real_estate: "Nieruchomość",
  investment: "Inwestycja",
  other: "Inne",
};

type AccountFilter = "active" | "archived" | "hidden" | "liabilities" | "investment";

interface DashboardAccountsPanelProps {
  accounts: DashboardAccountRow[];
}

export function DashboardAccountsPanel({ accounts }: DashboardAccountsPanelProps) {
  const [filter, setFilter] = useState<AccountFilter>("active");

  const filtered = useMemo(() => {
    let list = [...accounts];
    switch (filter) {
      case "active":
        list = list.filter(
          (a) =>
            a.lifecycle_status === "active" &&
            a.show_on_dashboard &&
            a.account_type !== "loan"
        );
        break;
      case "archived":
        list = list.filter((a) => a.lifecycle_status === "archived");
        break;
      case "hidden":
        list = list.filter((a) => !a.show_on_dashboard && a.lifecycle_status === "active");
        break;
      case "liabilities":
        list = list.filter((a) => a.account_type === "loan" || a.balance_pln < 0);
        break;
      case "investment":
        list = list.filter((a) =>
          ["investment", "broker", "deposit"].includes(a.account_type)
        );
        break;
    }
    return list.sort((a, b) => Math.abs(b.balance_pln) - Math.abs(a.balance_pln));
  }, [accounts, filter]);

  const filters: { id: AccountFilter; label: string }[] = [
    { id: "active", label: "Aktywne" },
    { id: "archived", label: "Archiwalne" },
    { id: "hidden", label: "Ukryte" },
    { id: "liabilities", label: "Zobowiązania" },
    { id: "investment", label: "Inwestycyjne" },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-foreground">Konta</h3>
          <p className="text-xs text-muted">Salda w PLN na dziś</p>
        </div>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          Wszystkie
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium",
              filter === f.id
                ? "bg-primary text-white"
                : "bg-slate-100 text-muted hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-slate-50 py-8 text-center text-sm text-muted">
          Brak kont w tym widoku
        </div>
      ) : (
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {filtered.slice(0, 12).map((a) => (
            <Link
              key={a.account_id}
              href={`/accounts/${a.account_id}`}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{a.account_name}</p>
                <p className="text-[11px] text-muted">
                  {TYPE_LABELS[a.account_type] ?? a.account_type} · {a.currency}
                  {!a.has_opening_balance && a.lifecycle_status === "active" && (
                    <span className="ml-1 text-amber-600">· brak salda pocz.</span>
                  )}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    a.balance_pln < 0 ? "text-red-600" : "text-foreground"
                  )}
                >
                  {formatPln(a.balance_pln)}
                </span>
                {a.balanceChange != null && a.balanceChange !== 0 && (
                  <p
                    className={cn(
                      "text-[10px] tabular-nums",
                      a.balanceChange > 0 ? "text-emerald-600" : "text-red-600"
                    )}
                  >
                    {a.balanceChange > 0 ? "+" : ""}
                    {formatPln(a.balanceChange)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
