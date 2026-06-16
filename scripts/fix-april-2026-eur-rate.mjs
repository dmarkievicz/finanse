#!/usr/bin/env node
/** Korekta kwietnia 2026: EUR 250 × 4.69 = 1172.5 PLN (Excel pivot vs import 4.29). */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TX_ID = "489d611c-8f44-4b7a-b532-16e60aca6833";
const RATE = 4.69;
const AMOUNT_PLN = -1172.5;

const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf-8").split(/\r?\n/)) {
  const m = line.trim().match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await sb
  .from("transaction_entries")
  .update({ exchange_rate: RATE, amount_pln: AMOUNT_PLN })
  .eq("transaction_id", TX_ID)
  .select("id, amount, amount_pln, exchange_rate");

if (error) throw error;
console.log("Updated:", data);
