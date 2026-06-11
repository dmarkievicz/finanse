#!/usr/bin/env node
/**
 * Zastosuj migrację 10 (import_transaction_batch + verify_balance_integrity).
 * Wymaga SUPABASE_DB_URL lub SUPABASE_DB_PASSWORD w .env.local
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROJECT_REF = "nmmdmjfquldysrawatae";

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim().replace(/^\uFEFF/, "");
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function resolveDbUrl(env) {
  if (env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL) {
    return env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL;
  }
  const password = env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD;
  if (!password) return null;
  const host = env.SUPABASE_DB_HOST || `aws-0-eu-central-1.pooler.supabase.com`;
  return `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(password)}@${host}:6543/postgres`;
}

async function rpcExists(client) {
  const { rows } = await client.query(
    `SELECT 1 FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'import_transaction_batch'`
  );
  return rows.length > 0;
}

async function main() {
  const env = { ...loadEnvLocal(), ...process.env };
  const dbUrl = resolveDbUrl(env);

  if (!dbUrl) {
    console.error("❌ Brak SUPABASE_DB_URL lub SUPABASE_DB_PASSWORD w .env.local");
    console.error("");
    console.error("Supabase → Project Settings → Database → Connection string (URI)");
    console.error("Dodaj do .env.local:");
    console.error("  SUPABASE_DB_URL=postgresql://postgres.[ref]:[HASLO]@...pooler.supabase.com:6543/postgres");
    console.error("");
    console.error("Alternatywa: wklej plik supabase/migrations/20250615100000_10_import_transaction_batch.sql w SQL Editor");
    process.exit(1);
  }

  const sqlPath = join(ROOT, "supabase", "migrations", "20250615100000_10_import_transaction_batch.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    if (await rpcExists(client)) {
      console.log("✅ import_transaction_batch już istnieje — pomijam migrację 10.");
      return;
    }

    console.log("📡 Połączono z bazą. Stosuję migrację 10…");
    await client.query(sql);
    console.log("✅ Migracja 10 zastosowana.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("❌", err.message);
  process.exit(1);
});
