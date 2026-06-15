import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addVaultCoin } from "@/lib/gold/add-vault-coin";
import {
  fetchPortfolioByKind,
  portfolioKeyForVault,
} from "@/lib/queries/investment-portfolios";
import type { VaultCoinSeries } from "@/lib/gold/coin-stock-images";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Nie zalogowano" }, { status: 401 });

    const portfolio = await fetchPortfolioByKind(supabase, "gold");
    if (!portfolio) {
      return NextResponse.json(
        { error: "Brak portfela złota (konto ZŁOTO). Uruchom import lub seed." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const purchasePrice = Number(body.purchase_price_pln);
    const weightGrams = Number(body.weight_grams);
    const currentValue =
      body.current_value_pln != null ? Number(body.current_value_pln) : purchasePrice;

    if (!name) {
      return NextResponse.json({ error: "Wymagana nazwa monety" }, { status: 400 });
    }
    if (Number.isNaN(purchasePrice) || purchasePrice <= 0) {
      return NextResponse.json({ error: "Podaj cenę zakupu (PLN)" }, { status: 400 });
    }
    if (Number.isNaN(weightGrams) || weightGrams <= 0) {
      return NextResponse.json({ error: "Podaj wagę w gramach" }, { status: 400 });
    }

    const result = await addVaultCoin(supabase, user.id, {
      portfolio_id: portfolioKeyForVault(portfolio),
      name,
      series: body.series as VaultCoinSeries | undefined,
      vault_row: body.vault_row != null ? Number(body.vault_row) : undefined,
      vault_col: body.vault_col != null ? Number(body.vault_col) : undefined,
      vault_slot: body.vault_slot === "eagle" ? "eagle" : "grid",
      weight_grams: weightGrams,
      purity: body.purity != null ? Number(body.purity) : undefined,
      purchase_price_pln: purchasePrice,
      current_value_pln: currentValue,
      purchase_date: body.purchase_date
        ? String(body.purchase_date)
        : new Date().toISOString().slice(0, 10),
      mint: body.mint ? String(body.mint).trim() : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    });

    return NextResponse.json({ ok: true, id: result.instrumentId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Błąd";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
