import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const target_amount = Number(body.target_amount);
    const target_date = body.target_date ? String(body.target_date) : null;
    const goal_type = String(body.goal_type ?? "net_worth");

    if (!name || !target_amount || target_amount <= 0) {
      return NextResponse.json({ error: "Nieprawidłowe dane celu" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("goals")
      .select("id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const payload = {
      name,
      goal_type,
      target_amount,
      target_date,
      is_active: true,
    };

    const existingId = (existing as { id: string } | null)?.id;
    if (existingId) {
      const { error } = await supabase.from("goals").update(payload as never).eq("id", existingId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("goals")
        .insert({ ...payload, user_id: user.id } as never);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd zapisu celu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
