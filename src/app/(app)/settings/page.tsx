import { PageHeader } from "@/components/page-header";
import { GoalForm } from "@/components/settings/goal-form";
import { AnalysisStartForm } from "@/components/settings/analysis-start-form";
import { ExportPanel } from "@/components/settings/export-panel";
import { ExchangeRatesPanel } from "@/components/settings/exchange-rates-panel";
import { ReportsPanel } from "@/components/settings/reports-panel";
import { AuditHistory } from "@/components/audit/audit-history";
import { fetchRecentAudit } from "@/lib/queries/audit";
import { CategorizationRulesForm } from "@/components/settings/categorization-rules-form";
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

  const [txCount, reviewCount, goal, netWorth, rulesRes, catsRes, recentAudit] = await Promise.all([
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
    fetchRecentAudit(supabase, 50),
  ]);

  return (
    <div>
      <PageHeader title="Ustawienia" description="Konto, cele finansowe i bezpieczeństwo." />
      <div className="max-w-2xl space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium">Konto</h2>
          <p className="mt-2 text-sm text-muted">Email: {user?.email}</p>
          <p className="mt-1 font-mono text-xs text-muted">ID: {user?.id}</p>
        </div>

        <ExportPanel />

        <ReportsPanel />

        <ExchangeRatesPanel />

        <AuditHistory
          rows={recentAudit}
          title="Ostatnie zmiany (audit log)"
          emptyMessage="Brak wpisów audytu. Po migracji 11 nowe zmiany będą zapisywane automatycznie."
        />

        <AnalysisStartForm initialDate={settings?.analysis_start_date ?? null} />

        <CategorizationRulesForm
          rules={(rulesRes.data ?? []) as {
            id: string;
            pattern: string;
            category_id: string;
            priority: number;
            categories: { name: string } | null;
          }[]}
          categories={(catsRes.data ?? []) as { id: string; name: string }[]}
        />

        <div id="cel">
          <GoalForm initial={goal} currentNetWorth={netWorth} />
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium">Dane w bazie</h2>
          <ul className="mt-2 space-y-1 text-sm text-muted">
            <li>
              Transakcje:{" "}
              <span className="font-semibold text-foreground">
                {(txCount.count ?? 0).toLocaleString("pl-PL")}
              </span>
            </li>
            <li>
              Do poprawy:{" "}
              <span className="font-semibold text-foreground">{reviewCount.count ?? 0}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-medium">MFA (uwierzytelnianie dwuskładnikowe)</h2>
          <p className="mt-2 text-sm text-muted">
            Włącz TOTP w Supabase Dashboard → Authentication → MFA (Google Authenticator).
          </p>
        </div>
      </div>
    </div>
  );
}
