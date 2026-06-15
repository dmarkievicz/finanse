#!/usr/bin/env node
/** Uzupełnia image_url i coin_series w metadata monet Vault. */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const out = {};
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function inferSeries(name) {
  const n = name.toLowerCase();
  if (n.includes("kangur")) return "kangaroo";
  if (n.includes("britannia")) return "britannia";
  if (n.includes("filharmonik")) return "philharmonic";
  if (n.includes("klonowy") || n.includes("maple")) return "maple";
  if (n.includes("krugerrand")) return "krugerrand";
  if (n.includes("orzeł") || n.includes("orzel") || n.includes("eagle")) return "eagle";
  return null;
}

const sb = createClient(loadEnv().NEXT_PUBLIC_SUPABASE_URL, loadEnv().SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: rows } = await sb
  .from("instruments")
  .select("id, name, metadata")
  .eq("instrument_type", "GOLD")
  .filter("metadata->>vault_item", "eq", "true")
  .is("deleted_at", null);

let updated = 0;
for (const row of rows ?? []) {
  const meta = { ...(row.metadata ?? {}) };
  const series = meta.coin_series || inferSeries(row.name);
  if (!series) continue;
  meta.coin_series = series;
  delete meta.image_url;
  await sb.from("instruments").update({ metadata: meta }).eq("id", row.id);
  updated++;
  console.log(`  ${row.name} → ${series}`);
}

console.log(`\n✅ Zaktualizowano ${updated} monet.`);
