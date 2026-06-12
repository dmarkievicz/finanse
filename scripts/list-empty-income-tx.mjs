#!/usr/bin/env node
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

let allTxs = [];
let from = 0;
while (true) {
  const { data, error } = await sb
    .from("transactions")
    .select("id, date, status, type, categories(name), transaction_entries(id, amount_pln)")
    .eq("user_id", userId)
    .eq("type", "income")
    .is("deleted_at", null)
    .order("date")
    .range(from, from + 999);
  if (error) throw error;
  if (!data?.length) break;
  allTxs = allTxs.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}

const empty = allTxs.filter((t) => (t.transaction_entries ?? []).length === 0);
console.log("Income bez wpisów:", empty.length);
let total = 0;
for (const t of empty) {
  console.log(t.date, t.status, t.categories?.name, t.id);
}
console.log("Status breakdown:", Object.fromEntries(
  [...empty.reduce((m, t) => m.set(t.status, (m.get(t.status) ?? 0) + 1), new Map())]
));
