import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CategoryType } from "@/types/database";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const { data, error } = await supabase
      .from("categories")
      .select("id, name, type, color, icon, sort_order")
      .is("deleted_at", null)
      .order("name");

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
    const name = String(body.name ?? "").trim();
    const type = (body.type ?? "expense") as CategoryType;
    const color = body.color ? String(body.color) : null;
    const icon = body.icon ? String(body.icon) : null;

    if (!name) {
      return NextResponse.json({ error: "Nazwa jest wymagana" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name,
        type,
        color,
        icon,
      } as never)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Kategoria o tej nazwie już istnieje" }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, id: (data as { id: string }).id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd zapisu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
