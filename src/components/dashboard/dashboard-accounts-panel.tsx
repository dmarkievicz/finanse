"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DashboardAccountRow } from "@/lib/queries/dashboard";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import { isGoldLedgerAccount, isLiabilityAccountType } from "@/lib/accounts/classification";
import { AccountIcon } from "@/components/dashboard/account-icon";
import { formatPln } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  DashboardEmpty,
  DashboardPanel,
  DashboardPanelHeader,
  dashboardLink,
} from "@/components/dashboard/dashboard-ui";

type AccountFilter = "active" | "credit_card" | "savings" | "investment" | "liabilities";

const MAX_VISIBLE = 7;

interface DashboardAccountsPanelProps {
  accounts: DashboardAccountRow[];
}

export function DashboardAccountsPanel({ accounts }: DashboardAccountsPanelProps) {
  const [filter, setFilter] = useState<AccountFilter>("active");

  const filtered = useMemo(() => {
    let list = accounts.filter((a) => !isGoldLedgerAccount(a.account_name));
    switch (filter) {
      case "active":
        list = list.filter(
          (a) =>
            a.lifecycle_status === "active" &&
            a.show_on_dashboard &&
            !isLiabilityAccountType(a.account_type)
        );
        break;
      case "credit_card":
        list = list.filter((a) => a.account_type === "credit_card" && a.lifecycle_status === "active");
        break;
      case "savings":
        list = list.filter(
          (a) =>
            a.lifecycle_status === "active" &&
            (a.account_type === "deposit" || /oszczęd|lokat/i.test(a.account_name))
        );
        break;
      case "investment":
        list = list.filter(
          (a) =>
            a.lifecycle_status === "active" &&
            ["investment", "broker", "deposit"].includes(a.account_type) &&
            !/oszczęd|lokat/i.test(a.account_name)
        );
        break;
      case "liabilities":
        list = list.filter(
          (a) =>
            isLiabilityAccountType(a.account_type) ||
            (a.balance_pln < 0 && a.lifecycle_status === "active")
        );
        break;
    }
    return list.sort((a, b) => Math.abs(b.balance_pln) - Math.abs(a.balance_pln));
  }, [accounts, filter]);

  const filters: { id: AccountFilter; label: string }[] = [
    { id: "active", label: "Aktywne" },
    { id: "credit_card", label: "Karty" },
    { id: "savings", label: "Oszczędności" },
    { id: "investment", label: "Inwestycyjne" },
    { id: "liabilities", label: "Długi" },
  ];

  const visible = filtered.slice(0, MAX_VISIBLE);

  return (
    <DashboardPanel className="h-full">
      <DashboardPanelHeader
        title="Konta"
        subtitle="Salda w PLN"
        action={
          <Link href="/accounts" className={`inline-flex items-center gap-1 ${dashboardLink}`}>
            Zobacz wszystkie
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

      {visible.length === 0 ? (
        <DashboardEmpty>Brak kont w tym widoku</DashboardEmpty>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((a) => (
            <li key={a.account_id}>
              <Link
                href={`/accounts/${a.account_id}`}
                className="flex items-center gap-3 py-2.5 transition hover:bg-slate-50/80 -mx-2 px-2 rounded-lg"
              >
                <AccountIcon accountType={a.account_type} accountName={a.account_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-slate-800">{a.account_name}</p>
                  <p className="text-[11px] text-slate-400">
                    {ACCOUNT_TYPE_LABELS[a.account_type as keyof typeof ACCOUNT_TYPE_LABELS] ??
                      a.account_type}{" "}
                    · {a.currency}
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > MAX_VISIBLE && (
        <p className="mt-2 text-center text-[11px] text-slate-400">
          +{filtered.length - MAX_VISIBLE} więcej ·{" "}
          <Link href="/accounts" className="font-medium text-slate-600 hover:text-slate-800">
            pełna lista
          </Link>
        </p>
      )}
    </DashboardPanel>
  );
}
