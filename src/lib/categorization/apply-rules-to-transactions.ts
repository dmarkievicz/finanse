import type { ServerSupabaseClient } from "@/lib/supabase/server";
import { matchCategoryFromRules } from "@/lib/categorization/match-rule";
import { loadActiveCategorizationRules } from "@/lib/categorization/load-rules";

const BATCH_SIZE = 200;

interface TxRow {
  id: string;
  details: string | null;
  description: string | null;
  category_id: string | null;
  type: string;
}

export interface ApplyRulesResult {
  scanned: number;
  updated: number;
}

export async function applyCategorizationRulesToTransactions(
  supabase: ServerSupabaseClient,
  userId: string,
  options: { onlyUncategorized?: boolean } = {}
): Promise<ApplyRulesResult> {
  const onlyUncategorized = options.onlyUncategorized ?? true;
  const rules = await loadActiveCategorizationRules(supabase, userId);
  if (!rules.length) return { scanned: 0, updated: 0 };

  let scanned = 0;
  let updated = 0;
  let from = 0;

  while (true) {
    let query = supabase
      .from("transactions")
      .select("id, details, description, category_id, type")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .in("type", ["expense", "income"])
      .order("date", { ascending: false })
      .range(from, from + BATCH_SIZE - 1);

    if (onlyUncategorized) {
      query = query.is("category_id", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data ?? []) as TxRow[];
    if (!rows.length) break;

    for (const row of rows) {
      scanned++;
      const matchText = [row.details, row.description].filter(Boolean).join(" ");
      const match = matchCategoryFromRules(matchText, rules);
      if (!match) continue;
      if (
        row.category_id === match.category_id &&
        !onlyUncategorized
      ) {
        continue;
      }

      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          category_id: match.category_id,
          subcategory_id: match.subcategory_id,
        } as never)
        .eq("id", row.id)
        .eq("user_id", userId);

      if (!updateError) updated++;
    }

    if (rows.length < BATCH_SIZE) break;
    from += BATCH_SIZE;
  }

  return { scanned, updated };
}
