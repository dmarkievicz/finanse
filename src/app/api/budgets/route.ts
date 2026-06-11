import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = Number(searchParams.get("year") ?? now.getFullYear());
    const month = Number(searchParams.get("month") ?? now.getMonth() + 1);

    const { data, error } = await supabase
      .from("budgets")
      .select("id, category_id, year, month, limit_pln")
      .eq("year", year)
      .eq("month", month);

    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const body = await request.json();
    const category_id = body.category_id as string;
    const year = Number(body.year);
    const month = Number(body.month);
    const limit_pln = Number(body.limit_pln);

    if (!category_id || !year || !month || !limit_pln || limit_pln <= 0) {
      return NextResponse.json({ error: "Wymagane: kategoria, rok, miesiąc, limit > 0" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("budgets")
      .upsert(
        { user_id: user.id, category_id, year, month, limit_pln } as never,
        { onConflict: "user_id,category_id,year,month" }
      )
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd zapisu budżetu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

    const { error } = await supabase.from("budgets").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
