import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { fetchRecentAudit } from "@/lib/queries/audit";
import { createClient } from "@/lib/supabase/server";
import { fetchGoalForSettings } from "@/lib/queries/goals";
import { fetchUserSettings, balanceMode } from "@/lib/queries/settings";
import { rpcNetWorth } from "@/lib/supabase/rpc";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = new Date().toISOString().slice(0, 10);
  const settings = await fetchUserSettings(supabase);
  const mode = balanceMode(settings);

  const [txCount, reviewCount, goal, netWorth, rulesRes, catsRes, recentAudit, lastRateRes] =
    await Promise.all([
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .is("deleted_at", null),
      supabase
        .from("transactions")
        .select("*", { count: "exact", head: true })
        .eq("status", "needs_review"),
      fetchGoalForSettings(supabase),
      rpcNetWorth(supabase, today, mode),
      supabase
        .from("categorization_rules")
        .select("id, pattern, category_id, priority, categories(name)")
        .eq("is_active", true)
        .order("priority", { ascending: false }),
      supabase.from("categories").select("id, name").is("deleted_at", null).order("name"),
      fetchRecentAudit(supabase, 100),
      supabase
        .from("exchange_rates")
        .select("date")
        .is("user_id", null)
        .eq("source", "nbp")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const lastNbpDate = (lastRateRes.data as { date: string } | null)?.date ?? null;

  return (
    <SettingsPageClient
      email={user?.email}
      userId={user?.id}
      analysisStartDate={settings?.analysis_start_date ?? null}
      goal={goal}
      currentNetWorth={netWorth}
      rules={(rulesRes.data ?? []) as {
        id: string;
        pattern: string;
        category_id: string;
        priority: number;
        categories: { name: string } | null;
      }[]}
      categories={(catsRes.data ?? []) as { id: string; name: string }[]}
      transactionCount={txCount.count ?? 0}
      reviewCount={reviewCount.count ?? 0}
      lastNbpSyncDate={lastNbpDate}
      auditRows={recentAudit}
    />
  );
}
