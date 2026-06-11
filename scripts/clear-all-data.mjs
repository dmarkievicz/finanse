#!/usr/bin/env node
/**
 * Usuwa wszystkie dane finansowe użytkownika (zachowuje konto auth).
 * Użycie: node scripts/clear-all-data.mjs [--yes]
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_USER_EMAIL = "dmarkiewicz@go2.pl";
const BATCH = 500;

/** Kolejność usuwania (FK). batched=true dla dużych tabel. */
const TABLES = [
  { name: "investment_transactions", batched: true },
  { name: "transaction_entries", batched: true },
  { name: "transactions", batched: true },
  { name: "import_rows", batched: true },
  { name: "instrument_prices", batched: true },
  { name: "instruments", batched: false },
  { name: "portfolio_snapshots", batched: false },
  { name: "imports", batched: false },
  { name: "categorization_rules", batched: false },
  { name: "budgets", batched: false },
  { name: "subcategories", batched: false },
  { name: "categories", batched: false },
  { name: "goals", batched: false },
  { name: "monthly_snapshots", batched: false },
  { name: "audit_log", batched: true },
  { name: "accounts", batched: false },
];

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim().replace(/^\uFEFF/, "");
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function resolveUserId(supabase, email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`Nie znaleziono użytkownika: ${email}`);
  return user.id;
}

async function countRows(supabase, table, userId) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

async function deleteBatched(supabase, table, userId) {
  let total = 0;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("user_id", userId)
      .limit(BATCH);
    if (error) throw error;
    if (!data?.length) break;
    const ids = data.map((r) => r.id);
    const { error: delErr } = await supabase.from(table).delete().in("id", ids);
    if (delErr) throw delErr;
    total += ids.length;
    if (data.length < BATCH) break;
  }
  return total;
}

async function main() {
  const autoYes = process.argv.includes("--yes");
  const env = { ...loadEnvLocal(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const userEmail = env.IMPORT_USER_EMAIL || DEFAULT_USER_EMAIL;

  if (!url || !serviceKey) {
    console.error("❌ Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w .env.local");
    process.exit(1);
  }

  if (!autoYes) {
    console.error("❌ Uruchom z flagą --yes aby potwierdzić usunięcie wszystkich danych.");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = await resolveUserId(supabase, userEmail);
  console.log(`🗑️  Czyszczenie danych dla ${userEmail} (${userId})\n`);

  const summary = {};

  for (const { name, batched } of TABLES) {
    const before = await countRows(supabase, name, userId);
    if (before === 0) {
      summary[name] = 0;
      continue;
    }

    if (batched) {
      await deleteBatched(supabase, name, userId);
    } else {
      const { error } = await supabase.from(name).delete().eq("user_id", userId);
      if (error) throw new Error(`${name}: ${error.message}`);
    }

    summary[name] = before;
    console.log(`   ✓ ${name}: ${before}`);
  }

  const { error: settingsErr } = await supabase
    .from("user_settings")
    .update({ analysis_start_date: null, default_view_mode: "full_history" })
    .eq("user_id", userId);

  if (settingsErr && settingsErr.code !== "PGRST116") {
    console.warn(`   ⚠ user_settings: ${settingsErr.message}`);
  } else {
    console.log("   ✓ user_settings: zresetowano datę startu analiz");
  }

  console.log("\n✅ Wszystkie dane finansowe usunięte.");
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
