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

const sb = createClient(loadEnv().NEXT_PUBLIC_SUPABASE_URL, loadEnv().SUPABASE_SERVICE_ROLE_KEY);

let allTxs = [];
let from = 0;
while (true) {
  const { data } = await sb
    .from("transactions")
    .select("id, date, status, category_id, categories(name)")
    .eq("user_id", userId)
    .eq("type", "income")
    .is("deleted_at", null)
    .range(from, from + 999);
  if (!data?.length) break;
  allTxs = allTxs.concat(data);
  if (data.length < 1000) break;
  from += 1000;
}

const ids = allTxs.map((t) => t.id);
const entriesByTx = new Map();
for (let i = 0; i < ids.length; i += 200) {
  const chunk = ids.slice(i, i + 200);
  const { data } = await sb
    .from("transaction_entries")
    .select("transaction_id, amount_pln")
    .in("transaction_id", chunk);
  for (const e of data ?? []) {
    if (!entriesByTx.has(e.transaction_id)) entriesByTx.set(e.transaction_id, []);
    entriesByTx.get(e.transaction_id).push(e);
  }
}

const CASH = "Gotówka PLN";

const empty = allTxs.filter((t) => (entriesByTx.get(t.id) ?? []).length === 0);
const emptyIds = empty.map((t) => t.id);
const importByTx = new Map();
for (let i = 0; i < emptyIds.length; i++) {
  const { data } = await sb
    .from("import_rows")
    .select("transaction_id, row_number, raw_data")
    .in("transaction_id", emptyIds.slice(i, i + 1));
  for (const r of data ?? []) importByTx.set(r.transaction_id, r);
}

for (const t of empty) {
  const ir = importByTx.get(t.id);
  const raw = ir?.raw_data ?? {};
  const amount = Number(raw?.Amount ?? raw?.amount ?? 0);
  const target = String(raw?.["Target Account"] ?? "").trim() || CASH;
  console.log({
    id: t.id,
    date: t.date,
    category: t.categories?.name,
    amount,
    target,
    row: ir?.row_number,
  });
}
