#!/usr/bin/env node
/**
 * Ustawia salda początkowe kont na datę startu analiz (stan na koniec 2025).
 *
 * Użycie:
 *   node scripts/set-opening-balances-2026.mjs --dry-run
 *   node scripts/set-opening-balances-2026.mjs
 *   node scripts/set-opening-balances-2026.mjs --list
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const listAccounts = process.argv.includes("--list");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";

/** Nazwa konta w bazie → kwota (waluta konta; PLN/EUR/USD). */
const OPENING_BALANCES_2026 = [
  ["Portfel PLN", 10700],
  ["Portfel EURO", 285],
  ["portfel USD", 300],
  ["mBank PLN", 16023.16],
  ["mBank EURO", 0],
  ["ALIOR Bank PLN", 10000],
  ["LOKATY PLN", 75000],
  ["Alior EURO", 0],
  ["CC-mBank PLN", 0],
  ["BS Gilowice PLN", 9.73],
  ["ING PLN", 0],
  ["DM mBank PLN", 149900],
  ["Dm BOS", 0],
  ["XTB", 0],
  ["LEGO", 3588.83],
  ["BNP Paribas PLN", 160.81],
  ["REVOLUT PLN", 2621.76],
  ["ZŁOTO", 126667],
  ["Obligacje", 372553.38],
  ["CC-Revolut PLN", -262.65],
  ["VELO PLN", 0],
  ["hipoteczny mBank 1", 0],
  ["hipoteczny GS Gilowice", -426971.03],
  ["Pożyczone [od]", 0],
  ["Pożyczone [do]", 300],
  ["REVOLUT EURO", 2712.04],
  ["REVOLUT USD", 4448.96],
  ["N26 EURO", 0],
  ["Agricole PLN", 15.8],
];

const ACCOUNTS_TO_CREATE = [
  { name: "hipoteczny mBank 1", account_type: "loan", default_currency: "PLN" },
  { name: "hipoteczny GS Gilowice", account_type: "loan", default_currency: "PLN" },
];

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function norm(s) {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

const sb = createClient(loadEnv().NEXT_PUBLIC_SUPABASE_URL, loadEnv().SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: settings, error: settingsErr } = await sb
  .from("user_settings")
  .select("analysis_start_date")
  .eq("user_id", userId)
  .maybeSingle();
if (settingsErr) throw settingsErr;

const startDate = settings?.analysis_start_date;
if (!startDate) {
  console.error("❌ Brak analysis_start_date. Ustaw 2026-01-01 w Ustawieniach.");
  process.exit(1);
}

let { data: accounts, error: accErr } = await sb
  .from("accounts")
  .select("id, name, default_currency, lifecycle_status")
  .eq("user_id", userId)
  .is("deleted_at", null)
  .order("name");
if (accErr) throw accErr;

if (listAccounts) {
  console.log(`Data startu: ${startDate}\n`);
  for (const a of accounts) console.log(a.lifecycle_status.padEnd(10), a.name);
  process.exit(0);
}

function findAccount(name) {
  const exact = accounts.find((a) => a.name === name);
  if (exact) return exact;
  const n = norm(name);
  const matches = accounts.filter((a) => norm(a.name) === n);
  if (matches.length === 1) return matches[0];
  const active = matches.find((a) => a.lifecycle_status === "active");
  return active ?? matches[0] ?? null;
}

console.log(`📅 Data startu analiz: ${startDate}`);

for (const spec of ACCOUNTS_TO_CREATE) {
  if (findAccount(spec.name)) continue;
  console.log(`${dryRun ? "[dry-run] " : ""}Tworzę konto: ${spec.name}`);
  if (dryRun) continue;
  const { data: created, error } = await sb
    .from("accounts")
    .insert({
      user_id: userId,
      name: spec.name,
      account_type: spec.account_type,
      default_currency: spec.default_currency,
      lifecycle_status: "active",
      show_on_dashboard: true,
      include_in_net_worth: true,
      needs_review: false,
    })
    .select("id, name, default_currency, lifecycle_status")
    .single();
  if (error) throw error;
  accounts.push(created);
}

let saved = 0;
let skipped = 0;
const missing = [];

for (const [name, amount] of OPENING_BALANCES_2026) {
  const account = findAccount(name);
  if (!account) {
    missing.push(name);
    console.warn(`⚠️  Brak konta: ${name}`);
    continue;
  }

  if (amount === 0) {
    skipped++;
    continue;
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}${account.name} (${account.default_currency}): ${amount}`
  );
  saved++;

  if (dryRun) continue;

  const { data: existingTxs } = await sb
    .from("transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("is_opening_balance", true)
    .eq("date", startDate);

  for (const tx of existingTxs ?? []) {
    const { data: entries } = await sb
      .from("transaction_entries")
      .select("account_id")
      .eq("transaction_id", tx.id);
    if (!entries?.some((e) => e.account_id === account.id)) continue;
    await sb.from("transactions").delete().eq("id", tx.id);
  }

  const currency = account.default_currency;
  const { data: transaction, error: txError } = await sb
    .from("transactions")
    .insert({
      user_id: userId,
      date: startDate,
      type: "adjustment",
      description: `Saldo otwarcia — ${account.name} na dzień ${startDate}`,
      details: "Saldo początkowe — stan na koniec 2025",
      status: "confirmed",
      is_opening_balance: true,
    })
    .select("id")
    .single();
  if (txError) throw txError;

  const { error: entryError } = await sb.from("transaction_entries").insert({
    transaction_id: transaction.id,
    user_id: userId,
    account_id: account.id,
    amount,
    currency,
    exchange_rate: 1,
    amount_pln: amount,
    sort_order: 0,
  });
  if (entryError) throw entryError;
}

console.log(
  `\n${dryRun ? "Dry-run" : "Zapisano"}: ${saved} sald, pominięto ${skipped} zerowych` +
    (missing.length ? `, brak ${missing.length} kont` : "")
);
if (!dryRun && missing.length === 0) console.log("✅ Salda początkowe ustawione.");
