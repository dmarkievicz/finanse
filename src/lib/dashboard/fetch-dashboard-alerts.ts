import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { buildDashboardAlerts } from "@/lib/dashboard/alerts";
import { isLiabilityAccountType } from "@/lib/accounts/classification";
import { fetchAccountsManage } from "@/lib/queries/accounts";
import { fetchInstrumentsPortfolio } from "@/lib/queries/instruments";
import { rpcNeedsReviewCount } from "@/lib/supabase/rpc";
import type { DashboardPeriod } from "@/lib/dashboard/period";

export async function fetchDashboardAlerts(
  supabase: ServerSupabaseClient,
  period: DashboardPeriod
) {
  const { current } = period;

  const [
    needsReviewCount,
    manage,
    instruments,
    uncategorizedRes,
    errorRowsRes,
    failedImportsRes,
  ] = await Promise.all([
    rpcNeedsReviewCount(supabase),
    fetchAccountsManage(supabase),
    fetchInstrumentsPortfolio(supabase),
    supabase
      .from("transactions")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "confirmed")
      .is("category_id", null)
      .gte("date", current.from)
      .lte("date", current.to)
      .in("type", ["income", "expense"]),
    supabase
      .from("import_rows")
      .select("*", { count: "exact", head: true })
      .not("validation_errors", "is", null),
    supabase
      .from("imports")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed"),
  ]);

  const accounts = manage.accounts;
  const negativeNonLoanAccounts = accounts.filter(
    (a) =>
      a.lifecycle_status === "active" &&
      Number(a.balance_pln) < 0 &&
      !isLiabilityAccountType(a.account_type)
  ).length;

  const archivedInNetWorth = accounts.filter(
    (a) => a.lifecycle_status === "archived" && a.include_in_net_worth
  ).length;

  return buildDashboardAlerts({
    needsReviewCount,
    accountsNeedsReviewCount: manage.needsReviewCount,
    uncategorizedCount: uncategorizedRes.count ?? 0,
    importErrorRows: errorRowsRes.count ?? 0,
    failedImports: failedImportsRes.count ?? 0,
    accounts,
    instruments,
    negativeNonLoanAccounts,
    archivedInNetWorth,
  });
}
