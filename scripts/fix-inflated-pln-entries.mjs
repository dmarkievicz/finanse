#!/usr/bin/env node
/**
 * Naprawa błędnych amount_pln: PLN na koncie PLN pomnożone przez kurs z poprzedniego wiersza.
 * Użycie: node scripts/fix-inflated-pln-entries.mjs [--dry-run]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");

function loadEnv() {
  const out = {};
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function isInflated(entry, accountCurrency) {
  const rate = Number(entry.exchange_rate) || 1;
  const cur = (entry.currency ?? "PLN").toUpperCase();
  const acct = (accountCurrency ?? "PLN").toUpperCase();
  const amt = Math.abs(Number(entry.amount));
  const pln = Math.abs(Number(entry.amount_pln));
  return rate !== 1 && cur === "PLN" && acct === "PLN" && amt > 0 && pln > amt * 1.5;
}

function correctedPln(entry) {
  const sign = Number(entry.amount) < 0 ? -1 : Number(entry.amount) > 0 ? 1 : Number(entry.amount_pln) < 0 ? -1 : 1;
  return sign * Math.round(Math.abs(Number(entry.amount)) * 100) / 100;
}

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const fixes = [];
const pageSize = 1000;
let offset = 0;

while (true) {
  const { data: page, error: pageErr } = await sb
    .from("transaction_entries")
    .select(
      "id, transaction_id, amount, amount_pln, currency, exchange_rate, accounts(default_currency)"
    )
    .range(offset, offset + pageSize - 1);

  if (pageErr) throw pageErr;
  if (!page?.length) break;

  for (const e of page) {
    const acctCur = e.accounts?.default_currency;
    if (!isInflated(e, acctCur)) continue;
    const nextPln = correctedPln(e);
    if (Math.abs(nextPln - Number(e.amount_pln)) < 0.01) continue;
    fixes.push({
      id: e.id,
      transaction_id: e.transaction_id,
      amount: e.amount,
      old_pln: e.amount_pln,
      new_pln: nextPln,
      rate: e.exchange_rate,
    });
  }

  if (page.length < pageSize) break;
  offset += pageSize;
}

console.log(`Znaleziono ${fixes.length} wpisów do naprawy${dryRun ? " (dry-run)" : ""}:`);
for (const f of fixes) console.log(f);

if (!fixes.length) {
  console.log("Brak zmian.");
  process.exit(0);
}

if (dryRun) process.exit(0);

for (const f of fixes) {
  const { error: updErr } = await sb
    .from("transaction_entries")
    .update({ amount_pln: f.new_pln, exchange_rate: 1 })
    .eq("id", f.id);
  if (updErr) throw updErr;
  console.log(`✓ ${f.id}: ${f.old_pln} → ${f.new_pln}`);
}

console.log("Gotowe.");
