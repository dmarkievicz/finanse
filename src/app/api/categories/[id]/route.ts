import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CategoryType } from "@/types/database";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.name != null) updates.name = String(body.name).trim();
    if (body.type != null) updates.type = body.type as CategoryType;
    if (body.color !== undefined) updates.color = body.color;
    if (body.icon !== undefined) updates.icon = body.icon;

    const { error } = await supabase
      .from("categories")
      .update(updates as never)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd zapisu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { count, error: countErr } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("category_id", id)
      .is("deleted_at", null);

    if (countErr) throw countErr;
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Nie można usunąć kategorii z transakcjami. Scal lub przenieś transakcje." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("categories")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd usuwania";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
