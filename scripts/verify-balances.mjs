#!/usr/bin/env node
/**
 * Weryfikacja spójności sald po imporcie.
 * Użycie: node scripts/verify-balances.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_USER_EMAIL = "dmarkiewicz@go2.pl";

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

function signedAmountPln(amount, rate) {
  const abs = Math.round(Math.abs(Number(amount)) * Number(rate) * 100) / 100;
  return Number(amount) < 0 ? -abs : abs;
}

async function verifyJsFallback(supabase, userId) {
  let failed = false;
  let plnMismatch = 0;
  let offset = 0;
  const page = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("transaction_entries")
      .select("id, amount, exchange_rate, amount_pln, transactions!inner(type, status, deleted_at)")
      .eq("user_id", userId)
      .is("transactions.deleted_at", null)
      .range(offset, offset + page - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const expected = signedAmountPln(row.amount, row.exchange_rate);
      if (Math.abs(Number(row.amount_pln) - expected) > 0.02) plnMismatch++;
    }
    if (data.length < page) break;
    offset += page;
  }

  const icon1 = plnMismatch === 0 ? "✅" : "❌";
  if (plnMismatch > 0) failed = true;
  console.log(`${icon1} amount_pln_mismatch: ${plnMismatch} problemów`);

  const { data: txs, error: txErr } = await supabase
    .from("transactions")
    .select("id, type, transaction_entries(amount_pln)")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .in("type", ["transfer", "exchange"]);

  if (txErr) throw txErr;

  let transferBad = 0;
  for (const tx of txs ?? []) {
    const sum = (tx.transaction_entries ?? []).reduce((s, e) => s + Number(e.amount_pln), 0);
    if (Math.abs(sum) > 0.05) transferBad++;
  }

  const icon2 = transferBad === 0 ? "✅" : "❌";
  if (transferBad > 0) failed = true;
  console.log(`${icon2} transfer_not_zero: ${transferBad} problemów`);

  const { count: orphanCount, error: orphanErr } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "confirmed")
    .is("deleted_at", null);

  if (orphanErr) throw orphanErr;

  let confirmedWithout = 0;
  if (orphanCount && orphanCount > 0) {
    let o = 0;
    while (o < orphanCount) {
      const { data: chunk, error: cErr } = await supabase
        .from("transactions")
        .select("id, transaction_entries(id)")
        .eq("user_id", userId)
        .eq("status", "confirmed")
        .is("deleted_at", null)
        .range(o, o + 199);
      if (cErr) throw cErr;
      for (const t of chunk ?? []) {
        if (!t.transaction_entries?.length) confirmedWithout++;
      }
      if (!chunk?.length || chunk.length < 200) break;
      o += 200;
    }
  }

  const icon3 = confirmedWithout === 0 ? "✅" : "❌";
  if (confirmedWithout > 0) failed = true;
  console.log(`${icon3} confirmed_without_entries: ${confirmedWithout} problemów`);

  if (failed) {
    console.log("\n⚠️  Wykryto niespójności.");
    process.exit(1);
  }
  console.log("\n✅ Wszystkie kontrole sald przeszły pomyślnie (tryb JS).");
}

async function resolveUserId(supabase, email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email === email);
  if (!user) throw new Error(`Nie znaleziono użytkownika: ${email}`);
  return user.id;
}

async function main() {
  const env = { ...loadEnvLocal(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const userEmail = env.IMPORT_USER_EMAIL || DEFAULT_USER_EMAIL;

  if (!url || !serviceKey) {
    console.error("❌ Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const userId = await resolveUserId(supabase, userEmail);
  console.log(`🔍 Weryfikacja sald dla ${userEmail}\n`);

  const { data, error } = await supabase.rpc("verify_balance_integrity", {
    p_user_id: userId,
  });

  if (error) {
    if (error.code === "PGRST202" || /verify_balance_integrity/.test(error.message ?? "")) {
      console.log("ℹ️  RPC niedostępne — weryfikacja w trybie JS (migracja 10 nie zastosowana)\n");
      await verifyJsFallback(supabase, userId);
      return;
    }
    console.error("❌ Błąd RPC verify_balance_integrity:", error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  let failed = false;

  for (const row of rows) {
    const count = Number(row.issue_count ?? 0);
    const icon = count === 0 ? "✅" : "❌";
    if (count > 0) failed = true;
    console.log(`${icon} ${row.check_name}: ${count} problemów`);
    if (row.sample_ids?.length) {
      console.log(`   Przykłady ID: ${row.sample_ids.join(", ")}`);
    }
  }

  if (failed) {
    console.log("\n⚠️  Wykryto niespójności — sprawdź wpisy lub uruchom ponowny import.");
    process.exit(1);
  }

  console.log("\n✅ Wszystkie kontrole sald przeszły pomyślnie.");
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
