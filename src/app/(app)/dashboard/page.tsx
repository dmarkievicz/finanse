import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { fetchLookupData } from "@/lib/queries/transaction-detail";
import { parseDashboardPeriod } from "@/lib/dashboard/period";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/layout";
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
    <PageContainer>
      <PageHeader
        title="Pulpit finansowy"
        description={`${period.label} · PLN`}
        action={
          <DashboardToolbar
            periodLabel={period.label}
            periodPreset={period.preset}
            dateFrom={period.current.from}
            dateTo={period.current.to}
            accounts={activeAccounts}
            categories={lookup.categories}
          />
        }
      />

      <Suspense fallback={<DashboardSkeleton rows={2} />}>
        <DashboardKpiBlock searchParams={params} />
      </Suspense>

      <Suspense fallback={<DashboardSkeleton rows={4} />}>
        <DashboardDetailsBlock searchParams={params} />
      </Suspense>
    </PageContainer>
  );
}
