#!/usr/bin/env node
/**
 * Uzupełnia wpisy księgowe dla przychodów zaimportowanych bez konta docelowego
 * (status reconciled / needs_review, 0 wpisów).
 *
 * Użycie: node scripts/fix-empty-income-entries.mjs [--dry-run]
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";
const CASH_ACCOUNT = "Gotówka PLN";

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function signedAmountPln(amount, exchangeRate = 1) {
  const abs = Math.round(Math.abs(amount) * exchangeRate * 100) / 100;
  return amount < 0 ? -abs : abs;
}

function incomeEntry(amount, exchangeRate) {
  const amountPln = signedAmountPln(amount, exchangeRate);
  return { amount, amount_pln: amountPln };
}

const sb = createClient(loadEnv().NEXT_PUBLIC_SUPABASE_URL, loadEnv().SUPABASE_SERVICE_ROLE_KEY);

const { data: cashAccount } = await sb
  .from("accounts")
  .select("id, name")
  .eq("user_id", userId)
  .eq("name", CASH_ACCOUNT)
  .maybeSingle();

if (!cashAccount) {
  console.error(`❌ Brak konta ${CASH_ACCOUNT}`);
  process.exit(1);
}

let allTxs = [];
let from = 0;
while (true) {
  const { data, error } = await sb
    .from("transactions")
    .select("id, date, status, type, categories(name)")
    .eq("user_id", userId)
    .eq("type", "income")
    .is("deleted_at", null)
    .range(from, from + 999);
  if (error) throw error;
  if (!data?.length) break;
  allTxs = allTxs.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}

const ids = allTxs.map((t) => t.id);
const entriesByTx = new Map();
for (let i = 0; i < ids.length; i += 200) {
  const { data } = await sb
    .from("transaction_entries")
    .select("transaction_id")
    .in("transaction_id", ids.slice(i, i + 200));
  for (const e of data ?? []) {
    if (!entriesByTx.has(e.transaction_id)) entriesByTx.set(e.transaction_id, 0);
    entriesByTx.set(e.transaction_id, entriesByTx.get(e.transaction_id) + 1);
  }
}

const empty = allTxs.filter((t) => !entriesByTx.get(t.id));
console.log(`Przychody bez wpisów: ${empty.length}`);

for (const t of empty) {
  const { data: importRow } = await sb
    .from("import_rows")
    .select("row_number, raw_data")
    .eq("transaction_id", t.id)
    .maybeSingle();

  const raw = importRow?.raw_data ?? {};
  const amount = Number(raw.Amount ?? raw.amount);
  const rate = Number(raw["Exchange Rate"] ?? 1) || 1;
  const currency = String(raw["Currency of Amount"] || "PLN").trim() || "PLN";
  const target = String(raw["Target Account"] ?? "").trim() || CASH_ACCOUNT;

  let accountId = cashAccount.id;
  if (target !== CASH_ACCOUNT) {
    const { data: acc } = await sb
      .from("accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("name", target)
      .maybeSingle();
    if (acc) accountId = acc.id;
    else console.warn(`  ⚠️  Brak konta „${target}” — użyto ${CASH_ACCOUNT}`);
  }

  const signed = incomeEntry(amount, rate);
  console.log(
    `${dryRun ? "[dry-run] " : ""}${t.date} ${t.categories?.name} ${signed.amount_pln} PLN → ${target} (w.${importRow?.row_number ?? "?"})`
  );

  if (dryRun) continue;

  const { error: entryErr } = await sb.from("transaction_entries").insert({
    transaction_id: t.id,
    user_id: userId,
    account_id: accountId,
    amount: signed.amount,
    currency: currency === "EURO" ? "EUR" : currency,
    exchange_rate: rate,
    amount_pln: signed.amount_pln,
    sort_order: 0,
  });
  if (entryErr) throw entryErr;

  const { error: txErr } = await sb
    .from("transactions")
    .update({ status: "confirmed" })
    .eq("id", t.id);
  if (txErr) throw txErr;
}

console.log(dryRun ? "Dry-run zakończony." : "✅ Naprawiono przychody bez wpisów.");
