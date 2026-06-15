import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCollectiblePurchase } from "@/lib/collectibles/create-collectible-purchase";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const body = await request.json();
    const purchase_price_pln = Number(body.purchase_price_pln);
    if (!body.name?.trim() || !body.payment_account_id || Number.isNaN(purchase_price_pln)) {
      return NextResponse.json({ error: "Wymagane: name, payment_account_id, purchase_price_pln" }, { status: 400 });
    }

    const result = await createCollectiblePurchase(supabase, user.id, {
      name: String(body.name).trim(),
      payment_account_id: body.payment_account_id,
      purchase_date: body.purchase_date ?? new Date().toISOString().slice(0, 10),
      purchase_price_pln,
      set_number: body.set_number,
      condition: body.condition,
      estimated_value_pln:
        body.estimated_value_pln != null ? Number(body.estimated_value_pln) : undefined,
      notes: body.notes,
      create_bank_expense: body.create_bank_expense !== false,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd zapisu";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
