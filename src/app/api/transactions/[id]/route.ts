import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface PatchBody {
  status?: string;
  category_id?: string | null;
  subcategory_id?: string | null;
  date?: string;
  description?: string | null;
  details?: string | null;
  soft_delete?: boolean;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("id, date, type, status, description, details, category_id, subcategory_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const body = (await request.json()) as PatchBody;

    if (body.soft_delete) {
      const { error } = await supabase
        .from("transactions")
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;
      return NextResponse.json({ ok: true, deleted: true });
    }

    const patch: Record<string, unknown> = {};
    if (body.status !== undefined) patch.status = body.status;
    if (body.category_id !== undefined) patch.category_id = body.category_id;
    if (body.subcategory_id !== undefined) patch.subcategory_id = body.subcategory_id;
    if (body.date !== undefined) patch.date = body.date;
    if (body.description !== undefined) patch.description = body.description;
    if (body.details !== undefined) patch.details = body.details;

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: "Brak pól do aktualizacji" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("transactions")
      .update(patch as never)
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .select("id, status, category_id, date")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, transaction: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd aktualizacji";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
