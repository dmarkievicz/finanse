import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { rpcNeedsReviewCount } from "@/lib/supabase/rpc";

async function loadReviewCount(supabase: ServerSupabaseClient): Promise<number> {
  return rpcNeedsReviewCount(supabase);
}

export const getReviewCountForLayout = cache(
  async (supabase: ServerSupabaseClient, userId: string): Promise<number> => {
    const cached = unstable_cache(
      async () => loadReviewCount(supabase),
      ["needs-review-count", userId],
      { revalidate: 60, tags: [`review-count-${userId}`] }
    );
    return cached();
  }
);
