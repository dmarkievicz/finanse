import { createClient } from "@/lib/supabase/server";
import { balanceMode, fetchUserSettings } from "@/lib/queries/settings";
import { parseDashboardPeriod } from "@/lib/dashboard/period";
import { fetchDashboardCoreCached } from "@/lib/queries/dashboard-cached";
import { fetchDashboardData } from "@/lib/queries/dashboard";
import { DashboardKpiGrid } from "@/components/dashboard/dashboard-kpi-grid";

interface DashboardKpiBlockProps {
  searchParams: Record<string, string | undefined>;
}

export async function DashboardKpiBlock({ searchParams }: DashboardKpiBlockProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const period = parseDashboardPeriod(searchParams);
  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);

  let kpis;
  if (user) {
    const cached = await fetchDashboardCoreCached(supabase, user.id, period, mode);
    if (cached) {
      kpis = cached.kpis;
    }
  }

  if (!kpis) {
    const data = await fetchDashboardData(supabase, period);
    kpis = data.kpis;
  }

  return (
    <DashboardKpiGrid
      kpis={kpis}
      periodFrom={period.current.from}
      periodTo={period.current.to}
    />
  );
}
