import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("analysis_start_date, default_view_mode, base_currency")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    const row = data as {
      analysis_start_date: string | null;
      default_view_mode: string;
      base_currency: string;
    } | null;

    return NextResponse.json({
      analysis_start_date: row?.analysis_start_date ?? null,
      default_view_mode: row?.default_view_mode ?? "current",
      base_currency: row?.base_currency ?? "PLN",
    });
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

    if (!user) {
      return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });
    }

    const body = await request.json();
    const analysis_start_date = body.analysis_start_date as string | null | undefined;
    const default_view_mode = body.default_view_mode as string | undefined;

    if (analysis_start_date !== undefined && analysis_start_date !== null) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(analysis_start_date)) {
        return NextResponse.json({ error: "Niepoprawny format daty" }, { status: 400 });
      }
    }

    const payload = {
      user_id: user.id,
      ...(analysis_start_date !== undefined && { analysis_start_date }),
      ...(default_view_mode && { default_view_mode }),
    };

    const { data, error } = await supabase
      .from("user_settings")
      .upsert(payload as never, { onConflict: "user_id" })
      .select("analysis_start_date, default_view_mode, base_currency")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, settings: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd zapisu ustawień";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
