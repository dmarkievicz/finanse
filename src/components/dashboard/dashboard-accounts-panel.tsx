"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DashboardAccountRow } from "@/lib/queries/dashboard";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DashboardEmpty,
  DashboardPanel,
  DashboardPanelHeader,
  dashboardLink,
} from "@/components/dashboard/dashboard-ui";

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
    { id: "archived", label: "Archiwum" },
    { id: "hidden", label: "Ukryte" },
    { id: "liabilities", label: "Długi" },
    { id: "investment", label: "Inwest." },
  ];

  return (
    <DashboardPanel>
      <DashboardPanelHeader
        title="Konta"
        subtitle="Salda w PLN"
        action={
          <Link href="/accounts" className={`inline-flex items-center gap-1 ${dashboardLink}`}>
            Wszystkie
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-md px-2 py-1 text-[11px] font-medium transition",
              filter === f.id
                ? "bg-slate-800 text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <DashboardEmpty>Brak kont w tym widoku</DashboardEmpty>
      ) : (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {filtered.slice(0, 10).map((a) => (
            <li key={a.account_id}>
              <Link
                href={`/accounts/${a.account_id}`}
                className="flex items-center justify-between gap-2 py-2.5 transition hover:bg-slate-50/80 -mx-2 px-2 rounded-lg"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-slate-800">{a.account_name}</p>
                  <p className="text-[11px] text-slate-400">
                    {TYPE_LABELS[a.account_type] ?? a.account_type} · {a.currency}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={cn(
                      "text-[13px] font-semibold tabular-nums",
                      a.balance_pln < 0 ? "text-rose-500" : "text-slate-800"
                    )}
                  >
                    {formatPln(a.balance_pln)}
                  </p>
                  {a.balanceChange != null && a.balanceChange !== 0 && (
                    <p
                      className={cn(
                        "text-[10px] tabular-nums",
                        a.balanceChange > 0 ? "text-emerald-500" : "text-rose-500"
                      )}
                    >
                      {a.balanceChange > 0 ? "+" : ""}
                      {formatPln(a.balanceChange)}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  );
}
