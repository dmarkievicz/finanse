"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Download,
  Plus,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import {
  buildDashboardUrl,
  type DashboardChartRange,
  type DashboardPeriodPreset,
} from "@/lib/dashboard/period";
import { QuickTransactionDialog } from "@/components/dashboard/quick-transaction-dialog";

const PERIOD_OPTIONS: { value: DashboardPeriodPreset; label: string }[] = [
  { value: "this_month", label: "Ten miesiąc" },
  { value: "prev_month", label: "Poprzedni miesiąc" },
  { value: "this_year", label: "Ten rok" },
  { value: "custom", label: "Zakres własny" },
];

interface DashboardToolbarProps {
  periodLabel: string;
  periodPreset: DashboardPeriodPreset;
  chartRange: DashboardChartRange;
  dateFrom?: string;
  dateTo?: string;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; type: string }[];
}

export function DashboardToolbar({
  periodLabel,
  periodPreset,
  chartRange,
  dateFrom,
  dateTo,
  accounts,
  categories,
}: DashboardToolbarProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quickOpen, setQuickOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [from, setFrom] = useState(dateFrom ?? "");
  const [to, setTo] = useState(dateTo ?? "");

  function navigate(url: string) {
    startTransition(() => router.push(url));
  }

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setCustomOpen(!customOpen)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
          >
            {periodLabel}
            <ChevronDown className="h-4 w-4 text-muted" />
          </button>
          {customOpen && (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-border bg-card p-1 shadow-lg">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setCustomOpen(false);
                    if (opt.value === "custom") return;
                    navigate(
                      buildDashboardUrl({ period: opt.value, chart: chartRange })
                    );
                  }}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                    periodPreset === opt.value ? "font-semibold text-primary" : ""
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="border-t border-border p-2">
                <p className="mb-2 text-xs font-medium text-muted">Zakres własny</p>
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="rounded-md border border-border px-2 py-1 text-sm"
                  />
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="rounded-md border border-border px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    disabled={!from || !to}
                    onClick={() => {
                      setCustomOpen(false);
                      navigate(
                        `/dashboard?period=custom&from=${from}&to=${to}&chart=${chartRange}`
                      );
                    }}
                    className="rounded-md bg-primary px-2 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Zastosuj
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Dodaj transakcję</span>
        </button>

        <button
          type="button"
          onClick={refresh}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Odśwież</span>
        </button>

        <Link
          href="/api/export?format=csv"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-sm hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Eksport</span>
        </Link>
      </div>

      <QuickTransactionDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        accounts={accounts}
        categories={categories}
      />
    </>
  );
}
