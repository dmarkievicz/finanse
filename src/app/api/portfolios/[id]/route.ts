import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updatePortfolioManualValue } from "@/lib/queries/investment-portfolios";

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
    const manualValue =
      body.manual_market_value_pln === null || body.manual_market_value_pln === ""
        ? null
        : Number(body.manual_market_value_pln);

    if (manualValue != null && (Number.isNaN(manualValue) || manualValue < 0)) {
      return NextResponse.json({ error: "Niepoprawna wartość" }, { status: 400 });
    }

    await updatePortfolioManualValue(supabase, id, manualValue);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
