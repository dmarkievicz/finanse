import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchLookupData } from "@/lib/queries/transaction-detail";
import { parseDashboardPeriod } from "@/lib/dashboard/period";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DashboardKpiBlock } from "@/components/dashboard/dashboard-kpi-block";
import { DashboardDetailsBlock } from "@/components/dashboard/dashboard-details-block";

export const dynamic = "force-dynamic";

function DashboardSkeleton({ rows = 1 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl bg-slate-200/80" />
      ))}
    </div>
  );
}

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const period = parseDashboardPeriod(params);
  const lookup = await fetchLookupData(supabase);

  const activeAccounts = lookup.accounts
    .filter((a) => a.lifecycle_status === "active")
    .map((a) => ({ id: a.id, name: a.name, default_currency: a.default_currency }));

  return (
    <div className="-m-2 min-h-full bg-[#f6f7f9] p-2 lg:-m-4 lg:p-4">
      <div className="mx-auto max-w-[1320px] space-y-6">
        <header className="flex flex-col gap-4 rounded-xl border border-slate-200/90 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">
              Pulpit finansowy
            </h1>
            <p className="mt-0.5 text-[13px] text-slate-500">
              {period.label} · PLN
            </p>
          </div>
          <DashboardToolbar
            periodLabel={period.label}
            periodPreset={period.preset}
            dateFrom={period.current.from}
            dateTo={period.current.to}
            accounts={activeAccounts}
            categories={lookup.categories}
          />
        </header>

        <Suspense fallback={<DashboardSkeleton rows={2} />}>
          <DashboardKpiBlock searchParams={params} />
        </Suspense>

        <Suspense fallback={<DashboardSkeleton rows={4} />}>
          <DashboardDetailsBlock searchParams={params} />
        </Suspense>
      </div>
    </div>
  );
}
