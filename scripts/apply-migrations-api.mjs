#!/usr/bin/env node
/**
 * Migracje przez Supabase Management API.
 * Wymaga SUPABASE_ACCESS_TOKEN w .env.local
 * (Dashboard → Account → Access Tokens → Generate)
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROJECT_REF = "nmmdmjfquldysrawatae";

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

async function runMigration(token, name, query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/migrations`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, query }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${name}: ${res.status} ${text}`);
  }
  return res.json();
}

async function verify(token) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: "SELECT code FROM currencies ORDER BY code;" }),
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data;
}

async function main() {
  const env = loadEnvLocal();
  const token = env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN;

  if (!token) {
    console.error("❌ Brak SUPABASE_ACCESS_TOKEN w .env.local");
    console.error("");
    console.error("1. https://supabase.com/dashboard/account/tokens");
    console.error("2. Generate new token");
    console.error("3. Dodaj do .env.local:");
    console.error("   SUPABASE_ACCESS_TOKEN=sbp_...");
    console.error("");
    console.error("Potem: node scripts/apply-migrations-api.mjs");
    process.exit(1);
  }

  const dir = join(ROOT, "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log(`📡 Projekt: ${PROJECT_REF}`);
  console.log(`📂 Migracje: ${files.length} plików\n`);

  for (const file of files) {
    const query = readFileSync(join(dir, file), "utf-8");
    const name = file.replace(/\.sql$/, "");
    process.stdout.write(`  → ${file} ... `);
    try {
      await runMigration(token, name, query);
      console.log("✅");
    } catch (err) {
      console.log("❌");
      console.error(err.message);
      process.exit(1);
    }
  }

  console.log("\n🔍 Weryfikacja currencies...");
  const result = await verify(token);
  console.log("✅", JSON.stringify(result));
  console.log("\n✅ Wszystkie migracje zastosowane.");
}

main();
