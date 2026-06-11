import type { ServerSupabaseClient } from "@/lib/supabase/server";

export interface UserSettings {
  user_id: string;
  analysis_start_date: string | null;
  default_view_mode: "current" | "full_history";
  base_currency: string;
}

const DEFAULTS: Omit<UserSettings, "user_id"> = {
  analysis_start_date: null,
  default_view_mode: "current",
  base_currency: "PLN",
};

export async function fetchUserSettings(
  supabase: ServerSupabaseClient
): Promise<UserSettings | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, analysis_start_date, default_view_mode, base_currency")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    return { user_id: user.id, ...DEFAULTS };
  }

  const row = data as {
    user_id: string;
    analysis_start_date: string | null;
    default_view_mode: string;
    base_currency: string;
  };

  return {
    user_id: row.user_id,
    analysis_start_date: row.analysis_start_date,
    default_view_mode:
      row.default_view_mode === "full_history" ? "full_history" : "current",
    base_currency: row.base_currency,
  };
}

export function balanceMode(settings: UserSettings | null): "current" | "full" {
  if (!settings) return "current";
  if (settings.default_view_mode === "full_history") return "full";
  return settings.analysis_start_date ? "current" : "full";
}
