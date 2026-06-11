#!/usr/bin/env node
/**
 * Porównanie sald kont: Excel (replay) vs baza danych.
 * Użycie: node scripts/reconcile-balances.mjs [ścieżka.xlsx] [--tolerance=0.05]
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { readExcelRows } from "./lib/excel-rows.mjs";
import { replayBalancesFromExcel } from "./lib/balance-replay.mjs";

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

function findExcelFile(argPath) {
  if (argPath && !argPath.startsWith("--")) return argPath;
  const rawDir = join(ROOT, "data", "raw");
  if (!existsSync(rawDir)) return null;
  const files = readdirSync(rawDir).filter((f) => /\.xlsx?$/i.test(f));
  return files.length > 0 ? join(rawDir, files[0]) : null;
}

async function resolveUserId(supabase, email) {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error(`Nie znaleziono użytkownika: ${email}`);
  return user.id;
}

async function fetchDbBalances(supabase, userId) {
  const balances = new Map();
  let offset = 0;
  const page = 1000;

  while (true) {
    const { data, error } = await supabase
      .from("transaction_entries")
      .select("amount_pln, accounts!inner(name), transactions!inner(status, deleted_at)")
      .eq("user_id", userId)
      .is("transactions.deleted_at", null)
      .neq("transactions.status", "needs_review")
      .range(offset, offset + page - 1);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      const name = row.accounts?.name;
      if (!name) continue;
      balances.set(name, (balances.get(name) ?? 0) + Number(row.amount_pln));
    }

    if (data.length < page) break;
    offset += page;
  }

  return balances;
}

async function main() {
  const args = process.argv.slice(2);
  const toleranceArg = args.find((a) => a.startsWith("--tolerance="));
  const tolerance = toleranceArg ? Number(toleranceArg.split("=")[1]) : 0.05;
  const filePath = findExcelFile(args[0]);

  if (!filePath || !existsSync(filePath)) {
    console.error("❌ Nie znaleziono pliku Excel w data/raw/");
    process.exit(1);
  }

  const env = { ...loadEnvLocal(), ...process.env };
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const userEmail = env.IMPORT_USER_EMAIL || DEFAULT_USER_EMAIL;

  if (!url || !serviceKey) {
    console.error("❌ Brak NEXT_PUBLIC_SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  console.log(`📂 Excel: ${filePath}`);
  console.log(`📧 Użytkownik: ${userEmail}`);
  console.log(`📏 Tolerancja: ${tolerance} PLN\n`);

  const rawRows = await readExcelRows(filePath);
  const excelBalances = replayBalancesFromExcel(rawRows);

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userId = await resolveUserId(supabase, userEmail);
  const dbBalances = await fetchDbBalances(supabase, userId);

  const allAccounts = new Set([...excelBalances.keys(), ...dbBalances.keys()]);
  const sorted = [...allAccounts].sort((a, b) => a.localeCompare(b, "pl"));

  let mismatches = 0;
  let matched = 0;
  const rows = [];

  for (const account of sorted) {
    const excel = excelBalances.get(account) ?? 0;
    const db = dbBalances.get(account) ?? 0;
    const diff = Math.round((db - excel) * 100) / 100;
    const ok = Math.abs(diff) <= tolerance;
    if (ok) matched++;
    else mismatches++;
    rows.push({ account, excel, db, diff, ok });
  }

  console.log("Konto                          | Excel (PLN) | DB (PLN)    | Różnica");
  console.log("-".repeat(78));

  for (const r of rows) {
    if (r.excel === 0 && r.db === 0) continue;
    const icon = r.ok ? "✅" : "❌";
    const name = r.account.padEnd(28).slice(0, 28);
    console.log(
      `${icon} ${name} | ${r.excel.toFixed(2).padStart(11)} | ${r.db.toFixed(2).padStart(11)} | ${r.diff >= 0 ? "+" : ""}${r.diff.toFixed(2)}`
    );
  }

  console.log(`\n📊 Kont z danymi: ${rows.filter((r) => r.excel !== 0 || r.db !== 0).length}`);
  console.log(`✅ Zgodne (±${tolerance}): ${matched}`);
  console.log(`❌ Rozjazdy: ${mismatches}`);

  if (mismatches > 0) {
    console.log(
      "\nℹ️  Różnice mogą wynikać z: needs_review bez wpisów, sald otwarcia, trybu current, duplikatów importu."
    );
    process.exit(1);
  }

  console.log("\n✅ Salda Excel vs DB zgodne w granicy tolerancji.");
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
