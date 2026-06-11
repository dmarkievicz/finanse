import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ACCOUNT_DEFAULTS } from "@/lib/import/account-defaults";
import type { AccountLifecycleStatus } from "@/types/database";

type BulkAction = "activate" | "archive" | "hide_dashboard" | "exclude_net_worth";

interface BulkBody {
  ids: string[];
  action: BulkAction;
}

interface PatchBody {
  id: string;
  lifecycle_status?: AccountLifecycleStatus;
  show_on_dashboard?: boolean;
  include_in_net_worth?: boolean;
  needs_review?: boolean;
  account_type?: string;
  notes?: string | null;
}

function patchForAction(action: BulkAction) {
  switch (action) {
    case "activate":
      return ACTIVE_ACCOUNT_DEFAULTS;
    case "archive":
      return {
        is_active: false,
        lifecycle_status: "archived" as const,
        show_on_dashboard: false,
        include_in_net_worth: false,
        needs_review: false,
      };
    case "hide_dashboard":
      return { show_on_dashboard: false };
    case "exclude_net_worth":
      return { include_in_net_worth: false };
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const body = (await request.json()) as PatchBody;
    if (!body.id) {
      return NextResponse.json({ error: "Brak id konta" }, { status: 400 });
    }

    const { id, ...fields } = body;
    if (fields.lifecycle_status === "active") {
      Object.assign(fields, ACTIVE_ACCOUNT_DEFAULTS);
    }

    const { data, error } = await supabase
      .from("accounts")
      .update(fields as never)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, name, lifecycle_status, show_on_dashboard, include_in_net_worth, needs_review")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, account: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd aktualizacji konta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const body = (await request.json()) as BulkBody;
    if (!body.ids?.length || !body.action) {
      return NextResponse.json({ error: "Brak ids lub action" }, { status: 400 });
    }

    const patch = patchForAction(body.action);
    const { data, error } = await supabase
      .from("accounts")
      .update(patch as never)
      .eq("user_id", user.id)
      .in("id", body.ids)
      .select("id");

    if (error) throw error;
    return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd operacji zbiorczej";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
