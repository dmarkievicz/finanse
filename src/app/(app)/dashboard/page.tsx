import { createClient } from "@/lib/supabase/server";
import { fetchLookupData } from "@/lib/queries/transaction-detail";
import { parseDashboardPeriod, dashboardSubtitle } from "@/lib/dashboard/period";
import { fetchDashboardPageData } from "@/lib/queries/fetch-dashboard-page";
import { PageHeader } from "@/components/page-header";
import { PageContainer } from "@/components/layout";
import { DashboardToolbar } from "@/components/dashboard/dashboard-toolbar";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const period = parseDashboardPeriod(params);
  const [lookup, data] = await Promise.all([
    fetchLookupData(supabase),
    fetchDashboardPageData(supabase, user?.id, params),
  ]);

  const activeAccounts = lookup.accounts
    .filter((a) => a.lifecycle_status === "active")
    .map((a) => ({ id: a.id, name: a.name, default_currency: a.default_currency }));

  return (
    <PageContainer>
      <PageHeader
        title="Pulpit finansowy"
        description={dashboardSubtitle(period)}
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

      <DashboardContent data={data} />
    </PageContainer>
  );
}
