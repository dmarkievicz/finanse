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

const { data: income } = await sb
  .from("transactions")
  .select("id, date, details, transaction_entries(amount, amount_pln)")
  .eq("user_id", userId)
  .eq("type", "income")
  .is("deleted_at", null)
  .limit(8000);

const negIncome = (income ?? []).filter((t) =>
  (t.transaction_entries ?? []).some((e) => Number(e.amount_pln) < 0)
);

const { data: expense } = await sb
  .from("transactions")
  .select("id, date, details, transaction_entries(amount, amount_pln)")
  .eq("user_id", userId)
  .eq("type", "expense")
  .is("deleted_at", null)
  .limit(15000);

const refunds = (expense ?? []).filter((t) =>
  (t.transaction_entries ?? []).some((e) => Number(e.amount_pln) > 0)
);

console.log("Ujemne przychody (wpisy amount_pln < 0):", negIncome.length);
if (negIncome[0]) {
  const e = negIncome[0].transaction_entries[0];
  console.log("  przykład:", negIncome[0].date, negIncome[0].details?.slice(0, 50), e);
}
console.log("Zwroty wydatków (wpis amount_pln > 0):", refunds.length);
if (refunds[0]) {
  const e = refunds[0].transaction_entries[0];
  console.log("  przykład:", refunds[0].date, refunds[0].details?.slice(0, 50), e);
}
