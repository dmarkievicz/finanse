#!/usr/bin/env node
import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { readExcelRows } from "./lib/excel-rows.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";
const TARGET_DATE = "2022-02-28";
const TARGET_CATEGORY = "Dzieci";
const TARGET_AMOUNT = 100;

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

function asString(val) {
  if (val == null) return "";
  return String(val).trim();
}

function parseNumber(val) {
  if (val === "" || val == null) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function excelDateToISO(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().slice(0, 10);
  if (typeof val === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(epoch.getTime() + val * 86400000).toISOString().slice(0, 10);
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function normalizeAccount(name) {
  if (!name) return "";
  const lower = name.trim().toLowerCase();
  const canonical = {
    "portfel pln": "Portfel PLN",
    portfel: "Portfel PLN",
    mbank: "mBank PLN",
  };
  return canonical[lower] || name.trim();
}

function normalizeForHash(val) {
  return asString(val).toLowerCase().replace(/\s+/g, " ").trim();
}

function computeImportHash(row) {
  const payload = [
    row.date,
    row.type,
    row.amount,
    row.currency,
    row.source_account,
    row.target_account,
    row.details,
    row.category,
    row.subcategory,
  ]
    .map(normalizeForHash)
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

function normalizeRow(raw, rowNumber) {
  const amount = parseNumber(getField(raw, "amount", " Amount "));
  const rate = parseNumber(getField(raw, "exchange rate", " Exchange Rate ")) ?? 1;
  const currency = (getField(raw, "currency of amount", "currency") || "PLN")
    .trim()
    .toUpperCase();
  const type = asString(getField(raw, "type"));
  return {
    row_number: rowNumber,
    date: excelDateToISO(getField(raw, "date")),
    type,
    type_lower: type.toLowerCase(),
    category: asString(getField(raw, "category")),
    subcategory: asString(getField(raw, "subcategory")),
    amount,
    currency: currency === "EURO" ? "EUR" : currency,
    source_account: normalizeAccount(getField(raw, "source account")),
    target_account: normalizeAccount(getField(raw, "target account")),
    exchange_rate: rate,
    details: asString(getField(raw, "details")),
  };
}

const rawDir = join(ROOT, "data", "raw");
const xlsxFiles = readdirSync(rawDir).filter((f) => /\.xlsx?$/i.test(f));
const excelPath = xlsxFiles[0] ? join(rawDir, xlsxFiles[0]) : null;

let excelMatches = [];
if (excelPath) {
  const buffer = readFileSync(excelPath);
  const rows = await readExcelRows(buffer);
  excelMatches = rows
    .map((r, i) => normalizeRow(r, i + 2))
    .filter(
      (r) =>
        r.date === TARGET_DATE &&
        r.category.toLowerCase().includes(TARGET_CATEGORY.toLowerCase()) &&
        Math.abs((r.amount ?? 0) - TARGET_AMOUNT) < 0.01
    );
}

const env = loadEnv();
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: dbTxs } = await sb
  .from("transactions")
  .select(
    "id, date, type, details, status, deleted_at, categories(name), subcategories(name), transaction_entries(amount_pln, accounts(name))"
  )
  .eq("user_id", userId)
  .eq("date", TARGET_DATE)
  .eq("type", "expense")
  .is("deleted_at", null);

const dzieciDb = (dbTxs ?? []).filter((t) =>
  t.categories?.name?.toLowerCase().includes("dzieci")
);

// Also search by amount 100 on that date
const amount100 = (dbTxs ?? []).filter((t) => {
  const net = (t.transaction_entries ?? []).reduce((s, e) => s + Number(e.amount_pln), 0);
  return Math.abs(-net - TARGET_AMOUNT) < 0.01;
});

console.log("=== Excel (Zeszyt1) ===");
console.log("Plik:", excelPath ?? "brak");
if (excelMatches.length === 0) {
  console.log("Brak wiersza:", TARGET_DATE, TARGET_CATEGORY, TARGET_AMOUNT);
} else {
  for (const r of excelMatches) {
    const hash = computeImportHash(r);
    console.log({
      row: r.row_number,
      date: r.date,
      type: r.type,
      category: r.category,
      subcategory: r.subcategory,
      amount: r.amount,
      source: r.source_account,
      details: r.details,
      import_hash: hash,
    });
  }
}

console.log("\n=== Baza (2022-02-28, Dzieci) ===");
console.log("Liczba:", dzieciDb.length);
for (const t of dzieciDb) {
  const net = (t.transaction_entries ?? []).reduce((s, e) => s + Number(e.amount_pln), 0);
  console.log({
    id: t.id,
    category: t.categories?.name,
    subcategory: t.subcategories?.name,
    amount_pln: -net,
    details: t.details,
    status: t.status,
  });
}

console.log("\n=== Baza (2022-02-28, wydatek ~100 zł) ===");
for (const t of amount100) {
  const net = (t.transaction_entries ?? []).reduce((s, e) => s + Number(e.amount_pln), 0);
  console.log({
    id: t.id,
    category: t.categories?.name,
    subcategory: t.subcategories?.name,
    amount_pln: -net,
    details: t.details,
  });
}

if (excelMatches.length > 0) {
  const hash = computeImportHash(excelMatches[0]);
  const { data: importRow } = await sb
    .from("import_rows")
    .select("status, transaction_id, validation_errors")
    .eq("user_id", userId)
    .eq("import_hash", hash)
    .maybeSingle();
  console.log("\n=== import_rows dla hash ===");
  console.log(importRow ?? "brak wpisu");

  const { data: dupes } = await sb
    .from("import_rows")
    .select("row_number, status, transaction_id")
    .eq("user_id", userId)
    .eq("import_hash", hash);
  console.log("Wszystkie import_rows z tym hashem:", dupes?.length ?? 0, dupes);
}

// Count all excel rows on that date
if (excelPath) {
  const buffer = readFileSync(excelPath);
  const rows = await readExcelRows(buffer);
  const onDate = rows
    .map((r, i) => normalizeRow(r, i + 2))
    .filter((r) => r.date === TARGET_DATE);
  console.log("\n=== Wszystkie wiersze Excel 2022-02-28 ===", onDate.length);
  for (const r of onDate) {
    console.log(
      `  w.${r.row_number} ${r.type} ${r.category}/${r.subcategory} ${r.amount} ${r.source_account} | ${r.details}`
    );
  }
}
