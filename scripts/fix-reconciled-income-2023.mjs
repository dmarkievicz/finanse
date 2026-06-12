#!/usr/bin/env node
/**
 * Naprawa przychodów „Inne przychody - M” z 2023 bez wpisów księgowych (status reconciled).
 * Użycie: node scripts/fix-reconciled-income-2023.mjs [--dry-run]
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";

const FIXES = [
  { date: "2023-08-31", amount: 800 },
  { date: "2023-11-30", amount: 2783.1 },
];

function loadEnv() {
  const path = join(ROOT, ".env.local");
  const out = {};
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: account } = await sb
  .from("accounts")
  .select("id, name")
  .eq("user_id", userId)
  .eq("name", "mBank Magda PLN")
  .maybeSingle();

if (!account) {
  console.error("❌ Brak konta mBank Magda PLN");
  process.exit(1);
}

const { data: category } = await sb
  .from("categories")
  .select("id, name")
  .eq("user_id", userId)
  .eq("name", "Inne przychody - M")
  .maybeSingle();

for (const fix of FIXES) {
  const { data: txs } = await sb
    .from("transactions")
    .select("id, date, status, transaction_entries(id)")
    .eq("user_id", userId)
    .eq("date", fix.date)
    .eq("type", "income")
    .eq("category_id", category?.id ?? null)
    .is("deleted_at", null);

  const tx = (txs ?? []).find((t) => (t.transaction_entries ?? []).length === 0);
  if (!tx) {
    console.log(`⚠️  ${fix.date}: nie znaleziono pustej transakcji`);
    continue;
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}Naprawa ${fix.date}: +${fix.amount} PLN → tx ${tx.id}`
  );

  if (dryRun) continue;

  const { error: entryErr } = await sb.from("transaction_entries").insert({
    transaction_id: tx.id,
    user_id: userId,
    account_id: account.id,
    amount: fix.amount,
    currency: "PLN",
    exchange_rate: 1,
    amount_pln: fix.amount,
    sort_order: 0,
  });
  if (entryErr) throw entryErr;

  const { error: txErr } = await sb
    .from("transactions")
    .update({ status: "confirmed" })
    .eq("id", tx.id);
  if (txErr) throw txErr;
}

console.log(dryRun ? "Dry-run zakończony." : "✅ Naprawiono transakcje.");
