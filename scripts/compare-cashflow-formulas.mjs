#!/usr/bin/env node
/**
 * Porównanie metod liczenia cashflow dla okresu.
 * Użycie: node scripts/compare-cashflow-formulas.mjs [from] [to]
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";

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

function splitFlow(type, net) {
  if (type === "income") return { income: net, expense: 0 };
  if (type === "expense") {
    if (net < 0) return { income: 0, expense: -net };
    if (net > 0) return { income: net, expense: 0 };
  }
  return { income: 0, expense: 0 };
}

const from = process.argv[2] ?? "2026-05-01";
const to = process.argv[3] ?? "2026-05-31";

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: settings } = await sb
  .from("user_settings")
  .select("analysis_start_date")
  .eq("user_id", userId)
  .maybeSingle();

const analysisStart = settings?.analysis_start_date ?? null;
const clampFrom = analysisStart && analysisStart > from ? analysisStart : from;

console.log("range:", from, "to", to, "| clampFrom:", clampFrom);

const all = [];
let off = 0;
while (true) {
  const { data, error } = await sb
    .from("transactions")
    .select("id, type, status, date, import_id, transaction_entries(amount_pln)")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .in("type", ["income", "expense"])
    .gte("date", clampFrom)
    .lte("date", to)
    .neq("status", "needs_review")
    .order("date")
    .range(off, off + 999);
  if (error) throw error;
  if (!data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
  off += 1000;
}

let excelIncome = 0;
let excelExpense = 0;
let refundAwareI = 0;
let refundAwareE = 0;
let m23i = 0;
let m23e = 0;
let m24e = 0;
let absExpense = 0;
let refundTotal = 0;
let negativeIncome = 0;

for (const t of all) {
  const net = (t.transaction_entries ?? []).reduce((s, e) => s + Number(e.amount_pln), 0);

  if (t.type === "income") {
    excelIncome += net;
    m23i += net;
    refundAwareI += net;
    if (net < 0) negativeIncome += net;
  }
  if (t.type === "expense") {
    excelExpense += -net;
    m24e += -net;
    absExpense += Math.abs(net);
    if (net < 0) m23e += -net;
    if (net > 0) refundTotal += net;
    const p = splitFlow(t.type, net);
    refundAwareI += p.income;
    refundAwareE += p.expense;
  }
}

console.log("\nTransactions:", all.length);
console.log("\n1) EXCEL style — suma ze znakiem w kolumnie Type (expense: -net_pln):");
console.log("   income:", round(excelIncome), "expense:", round(excelExpense), "surplus:", round(excelIncome - excelExpense));
console.log("\n2) Refund-aware APP (zwrot wydatku → przychód):");
console.log("   income:", round(refundAwareI), "expense:", round(refundAwareE), "surplus:", round(refundAwareI - refundAwareE));
console.log("\n3) Migration 23 (bez zwrotów w przychodzie):");
console.log("   income:", round(m23i), "expense:", round(m23e));
console.log("\n4) Migration 24 expense (-net na wszystkich expense):");
console.log("   income:", round(m23i), "expense:", round(m24e));
console.log("\n5) ABS expense:");
console.log("   income:", round(m23i), "expense:", round(absExpense));

console.log("\nSkładowe:");
console.log("   zwroty wydatków (expense net>0):", round(refundTotal));
console.log("   ujemne przychody:", round(negativeIncome));

// import_raw sample for refunds
const refunds = all.filter((t) => t.type === "expense").filter((t) => {
  const net = (t.transaction_entries ?? []).reduce((s, e) => s + Number(e.amount_pln), 0);
  return net > 0;
});
console.log("\nRefund txs:", refunds.length);

function round(n) {
  return Math.round(n * 100) / 100;
}
