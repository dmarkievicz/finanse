import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAccountUpdate, type AccountPatchInput } from "@/lib/accounts/patch-fields";

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

    const body = (await request.json()) as AccountPatchInput;
    const { fields, error: validationError } = buildAccountUpdate(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: "Brak pól do aktualizacji" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("accounts")
      .update(fields as never)
      .eq("id", id)
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .select(
        "id, name, account_number, account_type, default_currency, lifecycle_status, show_on_dashboard, include_in_net_worth, needs_review, notes"
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Konto o tej nazwie już istnieje" }, { status: 409 });
      }
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Nie znaleziono konta" }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json({ ok: true, account: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd aktualizacji konta";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
