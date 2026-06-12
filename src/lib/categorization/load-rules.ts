import type { CategorizationRule } from "@/lib/categorization/match-rule";
import type { ServerSupabaseClient } from "@/lib/supabase/server";

export async function loadActiveCategorizationRules(
  supabase: ServerSupabaseClient,
  userId: string
): Promise<CategorizationRule[]> {
  const { data, error } = await supabase
    .from("categorization_rules")
    .select("id, pattern, category_id, subcategory_id, priority")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority", { ascending: false });

  if (error) throw error;
  return (data ?? []) as CategorizationRule[];
}
