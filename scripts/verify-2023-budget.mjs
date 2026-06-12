#!/usr/bin/env node
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnv(), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";

const txs = [];
const pageSize = 1000;
let from = 0;
while (true) {
  const { data, error } = await sb
    .from("transactions")
    .select("id, type, category_id, transaction_entries(amount_pln)")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .gte("date", "2023-01-01")
    .lte("date", "2023-12-31")
    .in("type", ["income", "expense"])
    .neq("status", "needs_review")
    .order("date", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + pageSize - 1);
  if (error) throw error;
  if (!data?.length) break;
  txs.push(...data);
  if (data.length < pageSize) break;
  from += pageSize;
}

const netByTx = new Map();
const entries = [];
for (const tx of txs ?? []) {
  netByTx.set(tx.id, { type: tx.type, category_id: tx.category_id, net: 0 });
  for (const en of tx.transaction_entries ?? []) {
    const amt = Number(en.amount_pln);
    netByTx.get(tx.id).net += amt;
    entries.push({ transaction_id: tx.id, amount_pln: amt });
  }
}

let incomeNew = 0;
let expenseNew = 0;
let incomeOld = 0;
let expenseOld = 0;
for (const en of entries) {
  const tx = (txs ?? []).find((t) => t.id === en.transaction_id);
  if (!tx) continue;
  const amt = Number(en.amount_pln);
  if (tx.type === "income") incomeOld += amt;
  if (tx.type === "expense") expenseOld += -amt;
}
for (const [, row] of netByTx) {
  if (row.type === "income") incomeNew += row.net;
  if (row.type === "expense" && row.net < 0) expenseNew += -row.net;
}

const incomeByCat = new Map();
const expenseByCat = new Map();
for (const [, row] of netByTx) {
  const key = row.category_id ?? "uncat";
  if (row.type === "income" && row.net !== 0) {
    incomeByCat.set(key, (incomeByCat.get(key) ?? 0) + row.net);
  }
  if (row.type === "expense" && row.net < 0) {
    expenseByCat.set(key, (expenseByCat.get(key) ?? 0) + -row.net);
  }
}

const { data: cats } = await sb.from("categories").select("id, name").eq("user_id", userId);
const catById = new Map((cats ?? []).map((c) => [c.id, c]));
const label = (id) => (id === "uncat" ? "Bez kategorii" : catById.get(id)?.name ?? id);

console.log("2023 verification (full year, no analysis_start filter)");
console.log("Transactions:", txs?.length ?? 0);
console.log("");
console.log("Per-transaction (migration 23):");
console.log("  Income: ", incomeNew.toFixed(2));
console.log("  Expense:", expenseNew.toFixed(2));
console.log("");
console.log("Per-entry (migration 21):");
console.log("  Income: ", incomeOld.toFixed(2));
console.log("  Expense:", expenseOld.toFixed(2));
console.log("");
console.log("Excel expected:");
console.log("  Income:  362389.00");
console.log("  Expense: 230506.00");
console.log("");
console.log("Delta vs Excel (per-tx):");
console.log("  Income: ", (incomeNew - 362389).toFixed(2));
console.log("  Expense:", (expenseNew - 230506).toFixed(2));

const incomeRows = [...incomeByCat.entries()]
  .map(([id, v]) => ({ name: label(id), v }))
  .sort((a, b) => b.v - a.v);

const expenseRows = [...expenseByCat.entries()]
  .map(([id, v]) => ({ name: label(id), v }))
  .sort((a, b) => b.v - a.v);

console.log("\nIncome by category:");
for (const r of incomeRows) console.log(`  ${r.name}: ${r.v.toFixed(2)}`);
console.log("\nExpense by category:");
for (const r of expenseRows) console.log(`  ${r.name}: ${r.v.toFixed(2)}`);

const { data: settings } = await sb
  .from("user_settings")
  .select("analysis_start_date, balance_mode")
  .eq("user_id", userId)
  .maybeSingle();
console.log("\nUser settings:", settings);

const { count: needsReview } = await sb
  .from("transactions")
  .select("id", { count: "exact", head: true })
  .eq("user_id", userId)
  .gte("date", "2023-01-01")
  .lte("date", "2023-12-31")
  .in("type", ["income", "expense"])
  .eq("status", "needs_review");
console.log("needs_review excluded:", needsReview ?? 0);

let refundIncome = 0;
let skippedExpense = 0;
for (const [, row] of netByTx) {
  if (row.type === "expense" && row.net > 0) refundIncome += row.net;
  if (row.type === "expense" && row.net >= 0) skippedExpense += 1;
}
console.log("Expense txs with positive net (refunds as income in tx summary):", refundIncome.toFixed(2), `(${skippedExpense} txs)`);

let grossExpense = 0;
for (const tx of txs) {
  if (tx.type !== "expense") continue;
  for (const en of tx.transaction_entries ?? []) {
    const a = Number(en.amount_pln);
    if (a < 0) grossExpense += -a;
  }
}
console.log("Gross expense (sum of outflows only):", grossExpense.toFixed(2));
