import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const body = await request.json();
    const patch: Record<string, unknown> = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.symbol !== undefined) patch.symbol = body.symbol;
    if (body.instrument_type !== undefined) patch.instrument_type = body.instrument_type;
    if (body.currency !== undefined) patch.currency = body.currency;
    if (body.account_id !== undefined) patch.account_id = body.account_id;
    if (body.is_active !== undefined) patch.is_active = body.is_active;
    if (body.metadata !== undefined) patch.metadata = body.metadata;
    if (body.soft_delete) patch.deleted_at = new Date().toISOString();

    const { error } = await supabase
      .from("instruments")
      .update(patch as never)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
