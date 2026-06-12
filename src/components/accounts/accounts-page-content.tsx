"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { AccountsPageData } from "@/lib/queries/fetch-accounts-page";
import {
  buildAccountGroups,
  computeAccountsMetrics,
  filterAccountsByTab,
  isAccountGroupDefaultOpen,
  type AccountsTabId,
} from "@/lib/accounts/account-sections";
import { ACCOUNT_TYPE_LABELS } from "@/lib/queries/accounts";
import type { AccountType } from "@/types/database";
import { AccountsKpiCards } from "@/components/accounts/accounts-kpi-cards";
import { AccountGroupSectionBlock } from "@/components/accounts/account-group-section";
import { AccountsSummaryPanel } from "@/components/accounts/accounts-summary-panel";
import { cn } from "@/lib/utils";

const TABS: { id: AccountsTabId; label: string }[] = [
  { id: "active", label: "Aktywne" },
  { id: "archived", label: "Archiwalne" },
  { id: "hidden", label: "Ukryte" },
  { id: "all", label: "Wszystkie" },
];

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[];

interface AccountsPageContentProps {
  data: AccountsPageData;
}

export function AccountsPageContent({ data }: AccountsPageContentProps) {
  const [tab, setTab] = useState<AccountsTabId>("active");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const currencies = useMemo(() => {
    const set = new Set(data.accounts.map((a) => a.currency));
    return [...set].sort();
  }, [data.accounts]);

  const filtered = useMemo(() => {
    let rows = filterAccountsByTab(data.accounts, tab);

    if (typeFilter !== "all") {
      rows = rows.filter((a) => a.account_type === typeFilter);
    }
    if (currencyFilter !== "all") {
      rows = rows.filter((a) => a.currency === currencyFilter);
    }
    if (statusFilter === "active") {
      rows = rows.filter((a) => a.lifecycle_status === "active" && a.show_on_dashboard);
    } else if (statusFilter === "archived") {
      rows = rows.filter((a) => a.lifecycle_status === "archived");
    } else if (statusFilter === "hidden") {
      rows = rows.filter((a) => !a.show_on_dashboard);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((a) => a.account_name.toLowerCase().includes(q));
    }
    return rows;
  }, [data.accounts, tab, typeFilter, currencyFilter, statusFilter, search]);

  const groups = useMemo(() => buildAccountGroups(filtered), [filtered]);
  const metrics = useMemo(() => computeAccountsMetrics(filtered), [filtered]);

  return (
    <div className="space-y-5">
      <AccountsKpiCards
        netWorth={data.netWorth}
        assets={metrics.assets}
        liabilities={metrics.liabilities}
        activeCount={metrics.activeCount}
        asOfDate={data.asOfDate}
      />

      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-medium transition",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            label="Typ konta"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "all", label: "Wszystkie typy" },
              ...ACCOUNT_TYPES.map((t) => ({
                value: t,
                label: ACCOUNT_TYPE_LABELS[t],
              })),
            ]}
          />
          <FilterSelect
            label="Waluta"
            value={currencyFilter}
            onChange={setCurrencyFilter}
            options={[
              { value: "all", label: "Wszystkie" },
              ...currencies.map((c) => ({ value: c, label: c })),
            ]}
          />
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Wszystkie" },
              { value: "active", label: "Aktywne" },
              { value: "archived", label: "Archiwalne" },
              { value: "hidden", label: "Ukryte" },
            ]}
          />
        </div>
        <label className="relative block min-w-[12rem] flex-1 lg:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj konta..."
            className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none ring-primary/20 focus:ring-2"
          />
        </label>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          {groups.length === 0 ? (
            <div className="rounded-xl border border-border/80 bg-card px-6 py-16 text-center shadow-sm">
              <p className="text-sm font-medium text-foreground">Brak kont w tym widoku</p>
              <p className="mt-1 text-[13px] text-muted">
                Zmień zakładkę lub filtry, aby zobaczyć inne konta.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((section) => (
                <AccountGroupSectionBlock
                  key={section.id}
                  section={section}
                  defaultOpen={isAccountGroupDefaultOpen(section.id)}
                />
              ))}
            </div>
          )}
        </div>

        <aside className="w-full shrink-0 xl:sticky xl:top-4 xl:w-80 xl:self-start">
          <AccountsSummaryPanel
            netWorth={data.netWorth}
            assets={metrics.assets}
            liabilities={metrics.liabilities}
            cash={metrics.cash}
            investments={metrics.investments}
          />
        </aside>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
