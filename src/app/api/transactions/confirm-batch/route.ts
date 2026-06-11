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
    const ids = body.ids as string[] | undefined;
    const action = (body.action as string | undefined) ?? "confirm";

    if (!ids?.length) {
      return NextResponse.json({ error: "Brak ids" }, { status: 400 });
    }

    if (action !== "confirm" && action !== "skip") {
      return NextResponse.json({ error: "Nieznana akcja" }, { status: 400 });
    }

    const newStatus = action === "skip" ? "reconciled" : "confirmed";

    const { data, error } = await supabase
      .from("transactions")
      .update({ status: newStatus } as never)
      .eq("user_id", user.id)
      .eq("status", "needs_review")
      .in("id", ids)
      .select("id");

    if (error) throw error;
    return NextResponse.json({ ok: true, updated: data?.length ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
