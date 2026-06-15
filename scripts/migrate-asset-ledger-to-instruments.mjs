#!/usr/bin/env node
/**
 * Migruje salda pseudo-kont ZŁOTO / LEGO do instrumentów GOLD / COLLECTIBLE.
 * Ukrywa konta księgowe (show_on_dashboard=false, include_in_net_worth=false).
 *
 * Użycie: node scripts/migrate-asset-ledger-to-instruments.mjs [--dry-run]
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function isGold(name) {
  return /\bzłoto\b|\bzlot\b/i.test(name);
}
function isLego(name) {
  return /^lego$/i.test(name.trim());
}

const sb = createClient(loadEnv().NEXT_PUBLIC_SUPABASE_URL, loadEnv().SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: accounts } = await sb
  .from("accounts")
  .select("id, name")
  .eq("user_id", userId)
  .is("deleted_at", null);

for (const acc of accounts ?? []) {
  const name = acc.name;
  if (!isGold(name) && !isLego(name)) continue;

  const instrumentType = isGold(name) ? "GOLD" : "COLLECTIBLE";
  const label = isGold(name) ? "Złoto (migracja z konta księgowego)" : "LEGO (migracja z konta księgowego)";

  console.log(`\n${dryRun ? "[dry-run] " : ""}Konto: ${name} → ${instrumentType}`);

  if (!dryRun) {
    await sb
      .from("accounts")
      .update({
        show_on_dashboard: false,
        include_in_net_worth: false,
        needs_review: true,
      })
      .eq("id", acc.id);
  }

  const { data: entries } = await sb
    .from("transaction_entries")
    .select("amount_pln, transactions!inner(deleted_at)")
    .eq("account_id", acc.id)
    .is("transactions.deleted_at", null);

  const bal = (entries ?? []).reduce((s, e) => s + Number(e.amount_pln), 0);
  if (Math.abs(bal) < 0.01) {
    console.log("  Saldo ~0 — pomijam instrument");
    continue;
  }

  const { data: existing } = await sb
    .from("instruments")
    .select("id, name, investment_transactions(amount_pln)")
    .eq("user_id", userId)
    .eq("instrument_type", instrumentType)
    .ilike("name", `%migracja%`)
    .is("deleted_at", null);

  const already = (existing ?? []).some((i) =>
    (i.investment_transactions ?? []).some((t) => Math.abs(Number(t.amount_pln) - bal) < 1)
  );
  if (already) {
    console.log(`  Instrument migracyjny już istnieje (~${bal} PLN)`);
    continue;
  }

  console.log(`  Tworzę instrument: ${label}, ${bal} PLN`);

  if (dryRun) continue;

  const meta =
    instrumentType === "GOLD"
      ? {
          bullion_kind: "coin",
          weight_grams: 1,
          purity: 0.9999,
          purchase_price_pln: bal,
          purchase_date: "2026-01-01",
          payment_account_id: null,
          payment_account_name: "migracja",
        }
      : {
          collectible_kind: "lego",
          purchase_price_pln: bal,
          purchase_date: "2026-01-01",
          payment_account_id: null,
          payment_account_name: "migracja",
          estimated_value_pln: bal,
        };

  const { data: inst, error: instErr } = await sb
    .from("instruments")
    .insert({
      user_id: userId,
      name: label,
      instrument_type: instrumentType,
      currency: "PLN",
      metadata: meta,
    })
    .select("id")
    .single();

  let instrumentId;
  if (instErr?.code === "23514" && instrumentType === "COLLECTIBLE") {
    const { data: fb, error: fbErr } = await sb
      .from("instruments")
      .insert({
        user_id: userId,
        name: label,
        instrument_type: "OTHER",
        currency: "PLN",
        metadata: meta,
      })
      .select("id")
      .single();
    if (fbErr) throw fbErr;
    instrumentId = fb.id;
  } else if (instErr) {
    throw instErr;
  } else {
    instrumentId = inst.id;
  }

  const { error: txErr } = await sb.from("investment_transactions").insert({
    user_id: userId,
    instrument_id: instrumentId,
    date: "2026-01-01",
    type: "buy",
    quantity: instrumentType === "GOLD" ? 1 : 1,
    price_per_unit: bal,
    amount: bal,
    currency: "PLN",
    exchange_rate: 1,
    amount_pln: bal,
    fees: 0,
    notes: `Migracja salda konta ${name}`,
  });

  if (txErr) throw txErr;
}

console.log(dryRun ? "\nDry-run zakończony." : "\n✅ Migracja zakończona.");
