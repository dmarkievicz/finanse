import { createClient } from "@/lib/supabase/server";
import { fetchBudgetDashboardPageData } from "@/lib/queries/fetch-budget-dashboard";
import { PageContainer } from "@/components/layout";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { BudgetDashboardContent } from "@/components/dashboard/budget-dashboard-content";

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const data = await fetchBudgetDashboardPageData(supabase, params);

  return (
    <PageContainer>
      <DashboardHeader selection={data.selection} yearOptions={data.yearOptions} />
      <BudgetDashboardContent data={data} />
    </PageContainer>
  );
}
