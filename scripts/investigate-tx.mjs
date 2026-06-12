#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { readExcelRows } from "./lib/excel-rows.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";

const TARGET_DATE = process.argv[2] ?? "2022-10-31";
const TARGET_CATEGORY = process.argv[3] ?? "Inne przychod";
const TARGET_AMOUNT = Number(process.argv[4] ?? 1000);
const TARGET_TYPE = process.argv[5] ?? "income";

function loadEnv() {
  const path = join(ROOT, ".env.local");
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function normalizeKey(key) {
  return key.trim().toLowerCase().replace(/\s+/g, " ");
}

function getField(row, ...names) {
  for (const [key, val] of Object.entries(row)) {
    const nk = normalizeKey(key);
    for (const name of names) {
      if (nk === normalizeKey(name)) return val ?? "";
    }
  }
  return "";
}

function normalizeForHash(val) {
  return String(val ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function computeImportHash(row, includeCategory = true) {
  const fields = [
    row.date,
    row.type,
    row.amount,
    row.currency,
    row.source_account,
    row.target_account,
    row.details,
  ];
  if (includeCategory) {
    fields.push(row.category, row.subcategory);
  }
  return createHash("sha256").update(fields.map(normalizeForHash).join("|")).digest("hex");
}

function normalizeRow(raw, rowNumber) {
  let date = getField(raw, "date");
  if (date instanceof Date) date = date.toISOString().slice(0, 10);
  else if (typeof date === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    date = new Date(epoch.getTime() + date * 86400000).toISOString().slice(0, 10);
  } else date = String(date).slice(0, 10);

  return {
    row_number: rowNumber,
    date,
    type: String(getField(raw, "type")).trim(),
    category: String(getField(raw, "category")).trim(),
    subcategory: String(getField(raw, "subcategory")).trim(),
    amount: Number(getField(raw, "amount")),
    currency: String(getField(raw, "currency of amount") || "PLN").trim(),
    source_account: String(getField(raw, "source account")).trim(),
    target_account: String(getField(raw, "target account")).trim(),
    details: String(getField(raw, "details")).trim(),
  };
}

function findExcelFile() {
  const rawDir = join(ROOT, "data", "raw");
  const files = readdirSync(rawDir).filter((f) => /\.xlsx?$/i.test(f));
  return files.length ? join(rawDir, files[0]) : null;
}

const excelPath = findExcelFile();
const buffer = readFileSync(excelPath);
const rows = await readExcelRows(buffer);
const allRows = rows.map((r, i) => normalizeRow(r, i + 2));

const excelMatches = allRows.filter(
  (r) =>
    r.date === TARGET_DATE &&
    (r.category + r.subcategory).toLowerCase().includes(TARGET_CATEGORY.toLowerCase()) &&
    Math.abs((r.amount ?? 0) - TARGET_AMOUNT) < 0.01
);

const onDate = allRows.filter((r) => r.date === TARGET_DATE);

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: dbTxs } = await sb
  .from("transactions")
  .select(
    "id, date, type, details, status, categories(name), subcategories(name), transaction_entries(amount_pln, accounts(name))"
  )
  .eq("user_id", userId)
  .eq("date", TARGET_DATE)
  .eq("type", TARGET_TYPE)
  .is("deleted_at", null);

console.log("=== Excel matches ===");
for (const r of excelMatches) {
  console.log({
    row: r.row_number,
    ...r,
    hash_new: computeImportHash(r, true),
    hash_old: computeImportHash(r, false),
  });
}

console.log("\n=== DB", TARGET_DATE, TARGET_TYPE, "===");
for (const t of dbTxs ?? []) {
  const net = (t.transaction_entries ?? []).reduce((s, e) => s + Number(e.amount_pln), 0);
  console.log({
    id: t.id,
    category: t.categories?.name,
    subcategory: t.subcategories?.name,
    amount_pln: net,
    status: t.status,
    account: t.transaction_entries?.[0]?.accounts?.name,
  });
}

if (excelMatches[0]) {
  const r = excelMatches[0];
  for (const [label, h] of [
    ["new", computeImportHash(r, true)],
    ["old", computeImportHash(r, false)],
  ]) {
    const { data: byHash } = await sb
      .from("import_rows")
      .select("row_number, status, transaction_id, import_hash")
      .eq("user_id", userId)
      .eq("import_hash", h);
    console.log(`\nimport_rows hash ${label}:`, byHash);
  }

  const { data: byRow } = await sb
    .from("import_rows")
    .select("*")
    .eq("user_id", userId)
    .eq("row_number", r.row_number)
    .maybeSingle();
  console.log("\nimport_rows row_number", r.row_number, ":", byRow ?? "BRAK");

  // Collisions: same hash fields on same day
  const hNew = computeImportHash(r, true);
  const collisions = allRows.filter((x) => computeImportHash(x, true) === hNew && x.row_number !== r.row_number);
  console.log("\nKolizje new hash w Excel:", collisions);

  const hOld = computeImportHash(r, false);
  const oldCollisions = allRows.filter((x) => computeImportHash(x, false) === hOld);
  console.log("\nKolizje old hash w Excel:", oldCollisions.map((x) => ({
    row: x.row_number,
    type: x.type,
    category: x.category,
    amount: x.amount,
    target: x.target_account,
  })));
}

console.log(`\n=== Wszystkie wiersze Excel ${TARGET_DATE} (${onDate.length}) ===`);
for (const r of onDate) {
  console.log(
    `  w.${r.row_number} ${r.type} ${r.category}/${r.subcategory} ${r.amount} src=${r.source_account} tgt=${r.target_account}`
  );
}
