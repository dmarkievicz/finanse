import type { ServerSupabaseClient } from "@/lib/supabase/server";

export interface UserGoal {
  id: string | null;
  name: string;
  goal_type: string;
  target_amount: number;
  target_date: string | null;
  current: number;
}

const DEFAULT_GOAL = {
  name: "1 000 000 zł majątku netto",
  goal_type: "net_worth",
  target_amount: 1_000_000,
  target_date: "2029-06-01",
};

export async function fetchUserGoal(
  supabase: ServerSupabaseClient,
  currentNetWorth: number,
  liquidAssets?: number
): Promise<UserGoal> {
  const { data, error } = await supabase
    .from("goals")
    .select("id, name, goal_type, target_amount, target_date")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const row = data as {
    id: string;
    name: string;
    goal_type: string;
    target_amount: number | null;
    target_date: string | null;
  } | null;

  const goalType = row?.goal_type ?? DEFAULT_GOAL.goal_type;
  const current =
    goalType === "liquid_assets" && liquidAssets != null ? liquidAssets : currentNetWorth;

  if (!row) {
    return {
      id: null,
      ...DEFAULT_GOAL,
      current,
    };
  }

  return {
    id: row.id,
    name: row.name,
    goal_type: goalType,
    target_amount: Number(row.target_amount ?? DEFAULT_GOAL.target_amount),
    target_date: row.target_date,
    current,
  };
}

export async function fetchGoalForSettings(supabase: ServerSupabaseClient) {
  const { data } = await supabase
    .from("goals")
    .select("id, name, goal_type, target_amount, target_date")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data) return { ...DEFAULT_GOAL, id: null };

  const row = data as {
    id: string;
    name: string;
    goal_type: string;
    target_amount: number | null;
    target_date: string | null;
  };

  return {
    id: row.id,
    name: row.name,
    goal_type: row.goal_type,
    target_amount: Number(row.target_amount ?? 1_000_000),
    target_date: row.target_date ?? "",
  };
}
