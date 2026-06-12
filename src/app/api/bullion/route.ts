import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBullionPurchase } from "@/lib/gold/create-bullion-purchase";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const paymentAccountId = String(body.payment_account_id ?? "").trim();
    const purchaseDate = String(body.purchase_date ?? new Date().toISOString().slice(0, 10));
    const purchasePrice = Number(body.purchase_price_pln);
    const weightGrams = Number(body.weight_grams);

    if (!name) {
      return NextResponse.json({ error: "Wymagana nazwa monety" }, { status: 400 });
    }
    if (!paymentAccountId) {
      return NextResponse.json(
        { error: "Wybierz konto bankowe, z którego płacisz (np. mBank)" },
        { status: 400 }
      );
    }
    if (Number.isNaN(purchasePrice) || purchasePrice <= 0) {
      return NextResponse.json({ error: "Podaj cenę zakupu (PLN)" }, { status: 400 });
    }
    if (Number.isNaN(weightGrams) || weightGrams <= 0) {
      return NextResponse.json({ error: "Podaj wagę w gramach" }, { status: 400 });
    }

    const purity = body.purity != null ? Number(body.purity) : undefined;
    const year = body.year != null ? Number(body.year) : undefined;

    const result = await createBullionPurchase(supabase, user.id, {
      name,
      payment_account_id: paymentAccountId,
      purchase_date: purchaseDate,
      purchase_price_pln: purchasePrice,
      weight_grams: weightGrams,
      purity: purity != null && !Number.isNaN(purity) ? purity : undefined,
      mint: body.mint ? String(body.mint).trim() : undefined,
      year: year != null && !Number.isNaN(year) ? year : undefined,
      bullion_kind: body.bullion_kind === "bar" ? "bar" : "coin",
      symbol: body.symbol,
      notes: body.notes,
      create_bank_expense: body.create_bank_expense !== false,
    });

    return NextResponse.json({
      ok: true,
      id: result.instrumentId,
      cash_transaction_id: result.cashTransactionId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
