#!/usr/bin/env node
/**
 * Jednorazowy seed: 21 monet Bulion Vault z Excela.
 * portfolio_id = id konta ZŁOTO (działa bez migracji investment_portfolios).
 * Użycie: node scripts/seed-bullion-vault.mjs [--dry-run]
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";
const TROY_OZ = 31.1034768;

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const COINS = [
  { series: "kangaroo", row: 1, col: 1, name: "Australijski Kangur 1 oz", date: "2024-12-05", mint: "Mennica Mazovia", purchase: 11108.96, current: 15820 },
  { series: "britannia", row: 1, col: 2, name: "Britannia 1 oz", date: "2025-06-24", mint: "Mennica Kapitałowa", purchase: 12733, current: 15820 },
  { series: "philharmonic", row: 1, col: 3, name: "Filharmonik wiedeński 1 oz", date: "2025-12-03", mint: "Mennica Apart", purchase: 15919.37, current: 15820 },
  { series: "maple", row: 1, col: 4, name: "Kanadyjski liść klonowy 1 oz", date: "2023-01-18", mint: "Mennica Polska", purchase: 8760, current: 15820 },
  { series: "krugerrand", row: 1, col: 5, name: "Krugerrand 1 oz", date: "2023-10-19", mint: "Metale lokacyjne", purchase: 8628.3, current: 15820 },
  { series: "kangaroo", row: 2, col: 1, name: "Australijski Kangur 1/2 oz", date: "2023-12-08", mint: "Mennica Mazovia", purchase: 4438, current: 8092 },
  { series: "britannia", row: 2, col: 2, name: "Britannia 1/2 oz", date: "2026-03-31", mint: "Mennica Kapitałowa", purchase: 9160.22, current: 8092 },
  { series: "philharmonic", row: 2, col: 3, name: "Filharmonik wiedeński 1/2 oz", date: "2026-04-07", mint: "Mennica Apart", purchase: 9322.57, current: 8092 },
  { series: "maple", row: 2, col: 4, name: "Kanadyjski liść klonowy 1/2 oz", date: "2025-02-13", mint: "Mennica Polska", purchase: 6342.43, current: 8092 },
  { series: "krugerrand", row: 2, col: 5, name: "Krugerrand 1/2 oz", date: "2025-06-11", mint: "Metale lokacyjne", purchase: 6696, current: 8092 },
  { series: "kangaroo", row: 3, col: 1, name: "Australijski Kangur 1/4 oz", date: "2025-02-10", mint: "Mennica Mazovia", purchase: 3253.5, current: 4066 },
  { series: "britannia", row: 3, col: 2, name: "Britannia 1/4 oz", date: "2023-11-15", mint: "Mennica Kapitałowa", purchase: 2232.6, current: 4066 },
  { series: "philharmonic", row: 3, col: 3, name: "Filharmonik wiedeński 1/4 oz", date: "2026-03-26", mint: "Mennica Apart", purchase: 4492, current: 4066 },
  { series: "maple", row: 3, col: 4, name: "Kanadyjski liść klonowy 1/4 oz", date: "2025-03-13", mint: "Mennica Polska", purchase: 3193.13, current: 4066 },
  { series: "krugerrand", row: 3, col: 5, name: "Krugerrand 1/4 oz", date: "2025-06-11", mint: "Metale lokacyjne", purchase: 3463, current: 4066 },
  { series: "kangaroo", row: 4, col: 1, name: "Australijski Kangur 1/10 oz", date: "2025-02-10", mint: "Mennica Mazovia", purchase: 1346, current: 1634 },
  { series: "britannia", row: 4, col: 2, name: "Britannia 1/10 oz", date: "2025-02-10", mint: "Mennica Kapitałowa", purchase: 1322.6, current: 1634 },
  { series: "philharmonic", row: 4, col: 3, name: "Filharmonik wiedeński 1/10 oz", date: "2023-10-31", mint: "Mennica Apart", purchase: 957.54, current: 1634 },
  { series: "maple", row: 4, col: 4, name: "Kanadyjski liść klonowy 1/10 oz", date: "2023-11-02", mint: "Mennica Polska", purchase: 924.43, current: 1634 },
  { series: "krugerrand", row: 4, col: 5, name: "Krugerrand 1/10 oz", date: "2023-10-31", mint: "Metale lokacyjne", purchase: 986.78, current: 1634 },
  { series: "eagle", slot: "eagle", name: "Amerykański Orzeł 1 oz", date: "2026-04-10", mint: "Mennica Kapitałowa", purchase: 18531.7, current: 15820, weightOz: 1 },
];

const WEIGHT_OZ = { 1: 1, 2: 0.5, 3: 0.25, 4: 0.1 };

const sb = createClient(loadEnv().NEXT_PUBLIC_SUPABASE_URL, loadEnv().SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(dryRun ? "=== DRY RUN ===" : "=== SEED BULLION VAULT ===");

  const { data: goldAcc } = await sb
    .from("accounts")
    .select("id, name, metadata")
    .eq("user_id", userId)
    .ilike("name", "ZŁOTO")
    .is("deleted_at", null)
    .maybeSingle();

  if (!goldAcc) {
    console.log("Brak konta ZŁOTO — koniec.");
    return;
  }

  const portfolioId = goldAcc.id;
  const totalCurrent = COINS.reduce((s, c) => s + c.current, 0);

  if (!dryRun) {
    const meta = { ...(goldAcc.metadata ?? {}), portfolio_kind: "gold", manual_market_value_pln: totalCurrent };
    await sb
      .from("accounts")
      .update({
        metadata: meta,
        show_on_dashboard: false,
        include_in_net_worth: false,
      })
      .eq("id", portfolioId);
  }

  const { data: legacy } = await sb
    .from("instruments")
    .select("id, name")
    .eq("user_id", userId)
    .eq("instrument_type", "GOLD")
    .ilike("name", "%migracja%")
    .is("deleted_at", null);

  for (const leg of legacy ?? []) {
    console.log(`Usuwam legacy: ${leg.name}`);
    if (!dryRun) {
      await sb.from("instruments").update({ deleted_at: new Date().toISOString() }).eq("id", leg.id);
    }
  }

  const { data: existingVault } = await sb
    .from("instruments")
    .select("id")
    .eq("user_id", userId)
    .eq("instrument_type", "GOLD")
    .filter("metadata->>vault_item", "eq", "true")
    .is("deleted_at", null);

  if ((existingVault ?? []).length >= COINS.length) {
    console.log(`Vault już ma ${existingVault.length} monet — pomijam.`);
    return;
  }

  for (const coin of COINS) {
    const weightOz = coin.weightOz ?? WEIGHT_OZ[coin.row];
    const weightGrams = Math.round(weightOz * TROY_OZ * 10000) / 10000;
    console.log(`  + ${coin.name}`);
    if (dryRun) continue;

    const { data: inst, error: instErr } = await sb
      .from("instruments")
      .insert({
        user_id: userId,
        name: coin.name,
        instrument_type: "GOLD",
        currency: "PLN",
        metadata: {
          bullion_kind: "coin",
          weight_grams: weightGrams,
          purity: 0.9999,
          mint: coin.mint,
          purchase_price_pln: coin.purchase,
          purchase_date: coin.date,
          portfolio_id: portfolioId,
          vault_item: true,
          vault_slot: coin.slot ?? "grid",
          vault_row: coin.row ?? null,
          vault_col: coin.col ?? null,
          coin_series: coin.series,
          current_value_pln: coin.current,
        },
      })
      .select("id")
      .single();

    if (instErr) throw instErr;

    await sb.from("investment_transactions").insert({
      user_id: userId,
      instrument_id: inst.id,
      date: coin.date,
      type: "buy",
      quantity: weightGrams,
      price_per_unit: coin.purchase / weightGrams,
      amount: coin.purchase,
      currency: "PLN",
      exchange_rate: 1,
      amount_pln: coin.purchase,
      fees: 0,
      notes: "Seed Bulion Vault z Excela",
    });
  }

  console.log(dryRun ? "\nDry-run OK." : `\n✅ Seed OK. manual_market_value=${totalCurrent} PLN`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
