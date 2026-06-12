import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import type { DashboardPeriod } from "@/lib/dashboard/period";
import type { BalanceMode } from "@/lib/supabase/rpc";
import {
  bundleToDashboardCore,
  rpcDashboardBundle,
} from "@/lib/queries/dashboard-bundle";

function periodCacheKey(period: DashboardPeriod): string {
  const { current, previous } = period;
  return [
    period.preset,
    current.from,
    current.to,
    previous.from,
    previous.to,
  ].join("|");
}

async function loadBundleCached(
  supabase: ServerSupabaseClient,
  userId: string,
  period: DashboardPeriod,
  mode: BalanceMode
) {
  const cacheKey = periodCacheKey(period);
  return unstable_cache(
    async () => rpcDashboardBundle(supabase, period, mode),
    ["dashboard-bundle", userId, cacheKey, mode],
    { revalidate: 45, tags: [`dashboard-${userId}`] }
  )();
}

export const fetchDashboardCoreCached = cache(
  async (
    supabase: ServerSupabaseClient,
    userId: string,
    period: DashboardPeriod,
    mode: BalanceMode
  ) => {
    const bundle = await loadBundleCached(supabase, userId, period, mode);
    if (!bundle) return null;
    return bundleToDashboardCore(bundle, period);
  }
);
