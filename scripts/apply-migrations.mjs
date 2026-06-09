#!/usr/bin/env node
/**
 * Zastosuj migracje SQL na bazie Supabase.
 * Wymaga SUPABASE_DB_URL w .env.local (Supabase → Settings → Database → Connection string URI)
 *
 * Użycie: node scripts/apply-migrations.mjs
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function loadEnvLocal() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const dbUrl = env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL;

  if (!dbUrl) {
    console.error("❌ Brak SUPABASE_DB_URL w .env.local");
    console.error("");
    console.error("1. Supabase Dashboard → Project Settings → Database");
    console.error("2. Skopiuj Connection string (URI)");
    console.error("3. Dodaj do .env.local:");
    console.error("   SUPABASE_DB_URL=postgresql://postgres.[ref]:[HASLO]@...");
    console.error("");
    console.error("Alternatywa: wklej supabase/apply_all_migrations.sql w SQL Editor");
    process.exit(1);
  }

  let pg;
  try {
    pg = await import("pg");
  } catch {
    console.error("Zainstaluj pg: npm install pg");
    process.exit(1);
  }

  const sqlPath = join(ROOT, "supabase", "apply_all_migrations.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("📡 Połączono z bazą. Uruchamiam migracje…");

  try {
    await client.query(sql);
    console.log("✅ Migracje zastosowane pomyślnie.");
  } catch (err) {
    console.error("❌ Błąd migracji:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
