#!/usr/bin/env node
/** Synchronizuje manual_market_value z accounts.metadata → investment_portfolios. */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const sb = createClient(loadEnv().NEXT_PUBLIC_SUPABASE_URL, loadEnv().SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: portfolios } = await sb
  .from("investment_portfolios")
  .select("id, ledger_account_id, manual_market_value_pln")
  .is("deleted_at", null);

for (const p of portfolios ?? []) {
  const { data: acc } = await sb
    .from("accounts")
    .select("metadata")
    .eq("id", p.ledger_account_id)
    .maybeSingle();

  const manual = acc?.metadata?.manual_market_value_pln;
  if (manual == null) continue;
  if (p.manual_market_value_pln != null) continue;

  await sb
    .from("investment_portfolios")
    .update({ manual_market_value_pln: Number(manual) })
    .eq("id", p.id);

  console.log(`Synced portfolio ${p.id} ← ${manual} PLN`);
}

console.log("Done.");
