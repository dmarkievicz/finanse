import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const body = await request.json();
    const sourceId = body.source_id as string;
    const targetId = body.target_id as string;

    if (!sourceId || !targetId || sourceId === targetId) {
      return NextResponse.json({ error: "Wybierz różne kategorie" }, { status: 400 });
    }

    const { data: source, error: srcErr } = await supabase
      .from("categories")
      .select("id, name")
      .eq("id", sourceId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (srcErr) throw srcErr;
    if (!source) {
      return NextResponse.json({ error: "Kategoria źródłowa nie istnieje" }, { status: 404 });
    }

    const { data: target, error: tgtErr } = await supabase
      .from("categories")
      .select("id, name")
      .eq("id", targetId)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (tgtErr) throw tgtErr;
    if (!target) {
      return NextResponse.json({ error: "Kategoria docelowa nie istnieje" }, { status: 404 });
    }

    const { count, error: countErr } = await supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("category_id", sourceId)
      .is("deleted_at", null);

    if (countErr) throw countErr;
    const movedCount = count ?? 0;

    const { error: txErr } = await supabase
      .from("transactions")
      .update({ category_id: targetId, subcategory_id: null } as never)
      .eq("category_id", sourceId)
      .eq("user_id", user.id);

    if (txErr) throw txErr;

    const { error: archErr } = await supabase
      .from("categories")
      .update({ deleted_at: new Date().toISOString() } as never)
      .eq("id", sourceId)
      .eq("user_id", user.id);

    if (archErr) throw archErr;

    return NextResponse.json({
      ok: true,
      moved_count: movedCount,
      source_name: (source as { name: string }).name,
      target_name: (target as { name: string }).name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd scalania";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
