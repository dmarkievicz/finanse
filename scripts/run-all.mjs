#!/usr/bin/env node
/**
 * Pełny pipeline: migracja 10 → import Excel → weryfikacja sald → testy jednostkowe
 * Użycie: node scripts/run-all.mjs [--force-import]
 */

import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const forceImport = process.argv.includes("--force-import");

function run(label, cmd, args) {
  console.log(`\n${"=".repeat(60)}\n▶ ${label}\n${"=".repeat(60)}`);
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: true });
  if (r.status !== 0) {
    console.error(`\n❌ ${label} — kod ${r.status}`);
    return false;
  }
  return true;
}

console.log("🚀 Finanse — pełny setup\n");

if (!run("Testy jednostkowe (npm test)", "npm", ["test"])) process.exit(1);

const migrated = run("Migracja 10 (jeśli SUPABASE_DB_URL)", "node", [
  "scripts/apply-migration-10.mjs",
]);
if (!migrated) {
  console.log("\n⚠️  Migracja 10 pominięta — import użyje fallbacku legacy lub RPC po ręcznym SQL.");
}

const importArgs = ["scripts/import-excel.mjs"];
if (forceImport) importArgs.push("--force");

if (!run("Import Excel", "node", importArgs)) process.exit(1);

if (!run("Weryfikacja sald", "node", ["scripts/verify-balances.mjs"])) {
  console.log("\n⚠️  Weryfikacja wykryła problemy lub brak funkcji verify_balance_integrity (migracja 10).");
  process.exit(1);
}

console.log("\n✅ Wszystko zakończone pomyślnie.");
