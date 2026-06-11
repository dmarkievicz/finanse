import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { data, error } = await supabase
      .from("categorization_rules")
      .select("id, pattern, category_id, subcategory_id, priority, is_active, categories(name)")
      .eq("is_active", true)
      .order("priority", { ascending: false });

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
    const pattern = String(body.pattern ?? "").trim().toLowerCase();
    const category_id = body.category_id as string;
    const priority = Number(body.priority ?? 0);

    if (!pattern || !category_id) {
      return NextResponse.json({ error: "Wymagane: wzorzec i kategoria" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("categorization_rules")
      .insert({
        user_id: user.id,
        pattern,
        category_id,
        subcategory_id: body.subcategory_id ?? null,
        priority,
      } as never)
      .select("id")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
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

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

    const { error } = await supabase.from("categorization_rules").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
