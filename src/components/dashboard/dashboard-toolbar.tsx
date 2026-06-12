"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Download, Plus, RefreshCw, ChevronDown, Calendar } from "lucide-react";
import { buildDashboardUrl, type DashboardPeriodPreset } from "@/lib/dashboard/period";
import { QuickTransactionDialog } from "@/components/dashboard/quick-transaction-dialog";
import { cn } from "@/lib/utils";

const PERIOD_OPTIONS: { value: DashboardPeriodPreset; label: string }[] = [
  { value: "this_month", label: "Ten miesiąc" },
  { value: "prev_month", label: "Poprzedni miesiąc" },
  { value: "this_year", label: "Ten rok" },
  { value: "custom", label: "Zakres własny" },
];

const btnSecondary =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50 hover:border-slate-300";

interface DashboardToolbarProps {
  periodLabel: string;
  periodPreset: DashboardPeriodPreset;
  dateFrom?: string;
  dateTo?: string;
  accounts: { id: string; name: string; default_currency?: string }[];
  categories: { id: string; name: string; type: string }[];
}

export function DashboardToolbar({
  periodLabel,
  periodPreset,
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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setCustomOpen(!customOpen)}
            className={btnSecondary}
          >
            <Calendar className="h-4 w-4 text-slate-400" />
            {periodLabel}
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>
          {customOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setCustomOpen(false);
                    if (opt.value === "custom") return;
                    navigate(buildDashboardUrl({ period: opt.value }));
                  }}
                  className={cn(
                    "block w-full rounded-lg px-3 py-2 text-left text-[13px] hover:bg-slate-50",
                    periodPreset === opt.value && "font-semibold text-slate-900 bg-slate-50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
              <div className="border-t border-slate-100 p-2">
                <p className="mb-2 text-[11px] font-medium text-slate-400">Zakres własny</p>
                <div className="flex flex-col gap-2">
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-[13px]"
                  />
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    className="rounded-md border border-slate-200 px-2 py-1 text-[13px]"
                  />
                  <button
                    type="button"
                    disabled={!from || !to}
                    onClick={() => {
                      setCustomOpen(false);
                      navigate(
                        `/dashboard?period=custom&from=${from}&to=${to}`
                      );
                    }}
                    className="rounded-md bg-slate-800 px-2 py-1.5 text-[12px] font-medium text-white disabled:opacity-40"
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
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-[13px] font-medium text-white hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Dodaj</span>
        </button>

        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className={cn(btnSecondary, "disabled:opacity-50")}
        >
          <RefreshCw className={cn("h-4 w-4 text-slate-400", pending && "animate-spin")} />
        </button>

        <Link href="/api/export?format=csv" className={btnSecondary}>
          <Download className="h-4 w-4 text-slate-400" />
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
