import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addCollectibleItem } from "@/lib/collectibles/add-collectible-item";
import {
  fetchPortfolioByKind,
  portfolioKeyForVault,
} from "@/lib/queries/investment-portfolios";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const portfolio = await fetchPortfolioByKind(supabase, "lego");
    if (!portfolio) {
      return NextResponse.json({ error: "Brak portfela LEGO" }, { status: 400 });
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const purchasePrice = Number(body.purchase_price_pln);

    if (!name) {
      return NextResponse.json({ error: "Wymagana nazwa zestawu" }, { status: 400 });
    }
    if (Number.isNaN(purchasePrice) || purchasePrice <= 0) {
      return NextResponse.json({ error: "Podaj cenę zakupu" }, { status: 400 });
    }

    const result = await addCollectibleItem(supabase, user.id, {
      portfolio_id: portfolioKeyForVault(portfolio),
      name,
      purchase_price_pln: purchasePrice,
      current_value_pln:
        body.current_value_pln != null ? Number(body.current_value_pln) : undefined,
      purchase_date: body.purchase_date,
      set_number: body.set_number,
      notes: body.notes,
    });

    return NextResponse.json({ ok: true, id: result.instrumentId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
