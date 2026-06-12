import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { captureWealthSnapshot, saveWealthSnapshot } from "@/lib/snapshots/capture";
import { fetchPortfolioSnapshots } from "@/lib/queries/snapshots";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const snapshots = await fetchPortfolioSnapshots(supabase, 36);
    return NextResponse.json({ snapshots });
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

    const body = (await request.json().catch(() => ({}))) as { date?: string };
    const asOfDate = body.date ?? new Date().toISOString().slice(0, 10);

    const data = await captureWealthSnapshot(supabase, user.id, asOfDate);
    await saveWealthSnapshot(supabase, user.id, asOfDate, data);

    return NextResponse.json({ ok: true, date: asOfDate, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd zapisu snapshotu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
