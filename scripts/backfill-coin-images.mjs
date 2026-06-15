#!/usr/bin/env node
/** Uzupełnia image_url i coin_series w metadata monet Vault. */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const STOCK = {
  kangaroo: "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/2021_Australian_Gold_Kangaroo_1_oz_reverse.jpg/440px-2021_Australian_Gold_Kangaroo_1_oz_reverse.jpg",
  britannia: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Britannia_gold_coin_reverse.jpg/440px-Britannia_gold_coin_reverse.jpg",
  philharmonic: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Wiener_Philharmoniker_Goldm%C3%BCnze_1_Unze.jpg/440px-Wiener_Philharmoniker_Goldm%C3%BCnze_1_Unze.jpg",
  maple: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Canadian_Gold_Maple_Leaf.png/440px-Canadian_Gold_Maple_Leaf.png",
  krugerrand: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Krugerrand_1oz_1980.jpg/440px-Krugerrand_1oz_1980.jpg",
  eagle: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/American_Gold_Eagle_%28obverse%29.jpg/440px-American_Gold_Eagle_%28obverse%29.jpg",
};

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
  if (!meta.image_url) meta.image_url = STOCK[series];
  await sb.from("instruments").update({ metadata: meta }).eq("id", row.id);
  updated++;
  console.log(`  ${row.name} → ${series}`);
}

console.log(`\n✅ Zaktualizowano ${updated} monet.`);
