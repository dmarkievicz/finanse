#!/usr/bin/env node
/** Zastosuj migrację 11 (rozszerzony audit_log). */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROJECT_REF = "nmmdmjfquldysrawatae";
const MIGRATION = "20250616100000_11_audit_extended.sql";

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
  const host = env.SUPABASE_DB_HOST || "aws-0-eu-central-1.pooler.supabase.com";
  return `postgresql://postgres.${PROJECT_REF}:${encodeURIComponent(password)}@${host}:6543/postgres`;
}

async function main() {
  const env = { ...loadEnvLocal(), ...process.env };
  const dbUrl = resolveDbUrl(env);
  if (!dbUrl) {
    console.error("❌ Brak SUPABASE_DB_URL — wklej SQL w Supabase SQL Editor:");
    console.error(`   supabase/migrations/${MIGRATION}`);
    process.exit(1);
  }

  const sql = readFileSync(join(ROOT, "supabase", "migrations", MIGRATION), "utf-8");
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    console.log("📡 Stosuję migrację 11…");
    await client.query(sql);
    console.log("✅ Migracja 11 zastosowana.");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
