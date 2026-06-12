#!/usr/bin/env node
/**
 * Porównanie Zeszyt4.csv (2023) z transakcjami w Supabase.
 * Użycie: node scripts/compare-csv-2023.mjs [ścieżka.csv]
 */

import { createHash } from "crypto";
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CSV_PATH = process.argv[2] ?? join(ROOT, "data", "raw", "Zeszyt4.csv");
const userId = "e622b44d-f8c5-4ae1-ae15-90a5a744026d";

const TYPE_MAP = {
  expenses: "expense",
  expense: "expense",
  income: "income",
  transfer: "transfer",
  exchange: "exchange",
  adjustment: "adjustment",
};

function loadEnv() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const m = line.trim().match(/^([^=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const delimiter = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ";" : ",";
  const headers = parseCSVLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line, i) => {
    const values = parseCSVLine(line, delimiter);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = values[idx] ?? "";
    });
    return { rowNumber: i + 2, ...obj };
  });
  return { headers, rows, delimiter };
}

function asString(v) {
  return v == null ? "" : String(v).trim();
}

function parseNumber(val) {
  if (val === "" || val == null) return null;
  const cleaned = String(val).trim().replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
}

function excelDateToISO(val) {
  const s = asString(val);
  const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
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

function normalizeCurrency(val) {
  const c = asString(val).toUpperCase();
  if (!c) return "PLN";
  if (c === "EURO" || c === "EUR") return "EUR";
  return c;
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
  ]
    .map(normalizeForHash)
    .join("|");
  return createHash("sha256").update(payload).digest("hex");
}

function normalizeCsvRow(raw) {
  const amount = parseNumber(raw.Amount ?? raw.amount);
  const rate = parseNumber(raw["Exchange Rate"] ?? raw["Exchange rate"]) ?? 1;
  const base =
    parseNumber(raw["Amount (Base Currency)"] ?? raw["Amount (Base currency)"]) ??
    (amount != null ? Math.round(amount * rate * 100) / 100 : null);
  const type = asString(raw.Type ?? raw.type);
  return {
    date: excelDateToISO(raw.Date ?? raw.date),
    type,
    type_lower: type.toLowerCase(),
    tx_type: TYPE_MAP[type.toLowerCase()] ?? null,
    category: asString(raw.Category ?? raw.category),
    subcategory: asString(raw.Subcategory ?? raw.subcategory),
    amount,
    amount_base: base,
    currency: normalizeCurrency(raw["Currency of Amount"] ?? raw.Currency ?? "PLN"),
    source_account: normalizeAccount(asString(raw["Source Account"] ?? raw["Source account"])),
    target_account: normalizeAccount(asString(raw["Target Account"] ?? raw["Target account"])),
    exchange_rate: rate,
    details: asString(raw.Details ?? raw.details),
  };
}

/** Suma jak w arkuszu budżetowym Excel — kwota bazowa ze znakiem z wiersza. */
function excelTrackedAmount(row) {
  if (!row.tx_type || row.tx_type === "transfer" || row.tx_type === "exchange" || row.tx_type === "adjustment") {
    return null;
  }
  return row.amount_base ?? row.amount;
}

function addToMap(map, key, value) {
  const k = key?.trim() || "(brak kategorii)";
  map.set(k, (map.get(k) ?? 0) + value);
}

function normalizeAccountForMatch(name) {
  const n = normalizeAccount(name);
  return n || "*";
}

function matchKey(row, opts = { details: true, accounts: true }) {
  const amountForMatch =
    row.amount_base != null
      ? Math.round(row.amount_base * 100) / 100
      : row.amount;
  const parts = [
    row.date,
    row.type_lower ?? row.type?.toLowerCase(),
    amountForMatch,
    row.currency,
  ];
  if (opts.accounts !== false) {
    parts.push(normalizeAccountForMatch(row.source_account));
    parts.push(normalizeAccountForMatch(row.target_account));
  }
  if (opts.details) parts.push(row.details);
  return parts.map(normalizeForHash).join("|");
}

async function fetchDb2023(sb) {
  const txs = [];
  let from = 0;
  while (true) {
    const { data, error } = await sb
      .from("transactions")
      .select(
        "id, date, type, status, category_id, details, categories(name), transaction_entries(amount, amount_pln, currency, accounts(name))"
      )
      .eq("user_id", userId)
      .is("deleted_at", null)
      .gte("date", "2023-01-01")
      .lte("date", "2023-12-31")
      .order("date")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    if (!data?.length) break;
    txs.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return txs;
}

function dbAccountsFromTx(tx) {
  const entries = tx.transaction_entries ?? [];
  let source = "";
  let target = "";
  let currency = "PLN";
  for (const e of entries) {
    currency = normalizeCurrency(e.currency ?? currency);
    const acc = e.accounts?.name ?? "";
    if (tx.type === "expense") source = source || acc;
    else if (tx.type === "income") target = target || acc;
    else {
      if (Number(e.amount_pln) < 0) source = source || acc;
      if (Number(e.amount_pln) > 0) target = target || acc;
    }
  }
  return { source, target, currency };
}

function dbMatchKeyFromTx(tx, opts = { details: true, accounts: true }) {
  const excelAmt = dbExcelAmount(tx);
  const { source, target, currency } = dbAccountsFromTx(tx);
  const type =
    tx.type === "expense" ? "expenses" : tx.type === "income" ? "income" : tx.type;
  return matchKey(
    {
      date: tx.date,
      type,
      type_lower: type.toLowerCase(),
      amount: excelAmt,
      amount_base: excelAmt,
      currency,
      source_account: source,
      target_account: target,
      details: tx.details ?? "",
    },
    opts
  );
}

function dbExcelAmount(tx) {
  const net = (tx.transaction_entries ?? []).reduce((s, e) => s + Number(e.amount_pln), 0);
  if (tx.type === "income") return net;
  if (tx.type === "expense") return -net;
  return null;
}

const env = { ...loadEnv(), ...process.env };
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const csvContent = readFileSync(CSV_PATH, "utf-8");
const { rows: rawRows } = parseCSV(csvContent);
const csvRows = rawRows.map((r) => ({ ...normalizeCsvRow(r), rowNumber: r.rowNumber }));

const csvIncome = new Map();
const csvExpense = new Map();
let csvIncomeTotal = 0;
let csvExpenseTotal = 0;
const csvHashes = new Map();
const csvHashDupes = [];

for (const row of csvRows) {
  const tracked = excelTrackedAmount(row);
  if (tracked == null) continue;
  const hash = computeImportHash({
    date: row.date,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    source_account: row.source_account,
    target_account: row.target_account,
    details: row.details,
  });
  row.import_hash = hash;
  if (csvHashes.has(hash)) csvHashDupes.push({ hash, rowNumber: row.rowNumber, prev: csvHashes.get(hash) });
  else csvHashes.set(hash, row.rowNumber);

  if (row.tx_type === "income") {
    csvIncomeTotal += tracked;
    addToMap(csvIncome, row.category, tracked);
  } else if (row.tx_type === "expense") {
    csvExpenseTotal += tracked;
    addToMap(csvExpense, row.category, tracked);
  }
}

const dbTxs = await fetchDb2023(sb);
const dbByKey = new Map();
const dbByKeyLoose = new Map();
for (const tx of dbTxs) {
  const key = dbMatchKeyFromTx(tx, { details: true, accounts: true });
  const loose = dbMatchKeyFromTx(tx, { details: false, accounts: false });
  if (!dbByKey.has(key)) dbByKey.set(key, []);
  dbByKey.get(key).push(tx);
  if (!dbByKeyLoose.has(loose)) dbByKeyLoose.set(loose, []);
  dbByKeyLoose.get(loose).push(tx);
}

const csvByKey = new Map();
for (const row of csvRows) {
  const base = {
    date: row.date,
    type: row.type,
    type_lower: row.type_lower,
    amount: row.amount,
    amount_base: row.amount_base,
    currency: row.currency,
    source_account: row.source_account,
    target_account: row.target_account,
    details: row.details,
  };
  row.match_key = matchKey(base, { details: true, accounts: true });
  row.match_key_loose = matchKey(base, { details: false, accounts: false });
  if (!csvByKey.has(row.match_key_loose)) csvByKey.set(row.match_key_loose, []);
  csvByKey.get(row.match_key_loose).push(row);
}

const missingInDb = [];
const detailsMismatch = [];
for (const row of csvRows) {
  if (row.tx_type === "transfer" || row.tx_type === "exchange" || row.tx_type === "adjustment") continue;
  if (!row.date || row.amount == null) continue;
  if (dbByKeyLoose.has(row.match_key_loose)) {
    if (!dbByKey.has(row.match_key)) {
      detailsMismatch.push(row);
    }
    continue;
  }
  missingInDb.push(row);
}

const extraInDb = [];
for (const tx of dbTxs) {
  if (tx.type !== "income" && tx.type !== "expense") continue;
  const loose = dbMatchKeyFromTx(tx, { details: false, accounts: false });
  if (!csvByKey.has(loose)) {
    extraInDb.push(tx);
  }
}

const categoryMismatches = [];
for (const row of csvRows) {
  if (!row.tx_type || row.tx_type === "transfer" || !row.date) continue;
  const matches = dbByKeyLoose.get(row.match_key_loose);
  if (!matches?.length) continue;
  const tx = matches[0];
  const dbCat = tx.categories?.name ?? "(brak)";
  if (dbCat !== row.category) {
    categoryMismatches.push({
      rowNumber: row.rowNumber,
      date: row.date,
      type: row.type,
      csvCategory: row.category,
      dbCategory: dbCat,
      amount: excelTrackedAmount(row),
    });
  }
}

const amountMismatches = [];
for (const row of csvRows) {
  if (!row.tx_type || row.tx_type === "transfer") continue;
  const matches = dbByKey.get(row.match_key);
  if (!matches?.length) continue;
  const tx = matches[0];
  const csvAmt = excelTrackedAmount(row);
  const dbAmt = dbExcelAmount(tx);
  if (csvAmt != null && dbAmt != null && Math.abs(csvAmt - dbAmt) > 0.01) {
    amountMismatches.push({
      rowNumber: row.rowNumber,
      date: row.date,
      type: row.type,
      category: row.category,
      csv: csvAmt,
      db: dbAmt,
      diff: Math.round((dbAmt - csvAmt) * 100) / 100,
      details: row.details,
      status: tx.status,
    });
  }
}

const dbIncome = new Map();
const dbExpense = new Map();
let dbIncomeTotal = 0;
let dbExpenseTotal = 0;
let dbNeedsReviewIncome = 0;
let dbNeedsReviewExpense = 0;

for (const tx of dbTxs) {
  if (tx.type !== "income" && tx.type !== "expense") continue;
  const excelAmt = dbExcelAmount(tx);
  if (excelAmt == null) continue;
  const cat = tx.categories?.name ?? "(brak kategorii)";
  if (tx.status === "needs_review") {
    if (tx.type === "income") dbNeedsReviewIncome += excelAmt;
    else dbNeedsReviewExpense += excelAmt;
    continue;
  }
  if (tx.type === "income") {
    dbIncomeTotal += excelAmt;
    addToMap(dbIncome, cat, excelAmt);
  } else {
    dbExpenseTotal += excelAmt;
    addToMap(dbExpense, cat, excelAmt);
  }
}

function printCategoryDiff(label, csvMap, dbMap) {
  const keys = new Set([...csvMap.keys(), ...dbMap.keys()]);
  const diffs = [...keys]
    .map((k) => ({
      category: k,
      csv: csvMap.get(k) ?? 0,
      db: dbMap.get(k) ?? 0,
      diff: Math.round(((dbMap.get(k) ?? 0) - (csvMap.get(k) ?? 0)) * 100) / 100,
    }))
    .filter((r) => Math.abs(r.diff) > 0.01)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  console.log(`\n=== ${label} — rozbieżności per kategoria ===`);
  if (!diffs.length) {
    console.log("  (brak — 100% zgodność)");
    return;
  }
  for (const r of diffs) {
    console.log(
      `  ${r.category}: CSV ${r.csv.toFixed(2)} | DB ${r.db.toFixed(2)} | Δ ${r.diff >= 0 ? "+" : ""}${r.diff.toFixed(2)}`
    );
  }
}

const brokenCsvRows = csvRows.filter((r) => !r.date || r.amount == null);
let brokenCsvIncome = 0;
let brokenCsvExpense = 0;
for (const r of brokenCsvRows) {
  const a = excelTrackedAmount(r) ?? 0;
  if (r.tx_type === "income") brokenCsvIncome += a;
  if (r.tx_type === "expense") brokenCsvExpense += a;
}

console.log("Plik CSV:", CSV_PATH);
console.log("Wierszy CSV:", csvRows.length);
console.log("Uszkodzone wiersze CSV (wielowierszowe Details):", brokenCsvRows.length);
if (brokenCsvRows.length) {
  console.log(
    "  Kwoty na uszkodzonych wierszach — przychody:",
    brokenCsvIncome.toFixed(2),
    "wydatki:",
    brokenCsvExpense.toFixed(2)
  );
}
console.log("Transakcji DB 2023 (income+expense+transfer...):", dbTxs.length);
console.log("Duplikaty hash w CSV:", csvHashDupes.length);
let dupeIncome = 0;
let dupeExpense = 0;
for (const d of csvHashDupes) {
  const row = csvRows.find((r) => r.rowNumber === d.rowNumber);
  if (!row) continue;
  const a = excelTrackedAmount(row) ?? 0;
  if (row.tx_type === "income") dupeIncome += a;
  if (row.tx_type === "expense") dupeExpense += a;
}
if (csvHashDupes.length) {
  console.log(
    "  Suma zduplikowanych wierszy — przychody:",
    dupeIncome.toFixed(2),
    "wydatki:",
    dupeExpense.toFixed(2)
  );
  console.log("  Przykłady duplikatów:");
  for (const d of csvHashDupes.slice(0, 8)) {
    const row = csvRows.find((r) => r.rowNumber === d.rowNumber);
    if (!row) continue;
    console.log(
      `    wiersz ${row.rowNumber} ${row.date} ${row.category} ${excelTrackedAmount(row)?.toFixed(2)}`
    );
  }
}

const matchedCsvIncome = csvRows
  .filter((r) => r.tx_type === "income" && r.date && dbByKeyLoose.has(r.match_key_loose))
  .reduce((s, r) => s + (excelTrackedAmount(r) ?? 0), 0);
const matchedCsvExpense = csvRows
  .filter((r) => r.tx_type === "expense" && r.date && dbByKeyLoose.has(r.match_key_loose))
  .reduce((s, r) => s + (excelTrackedAmount(r) ?? 0), 0);
console.log("CSV przychody z dopasowaniem w DB:", matchedCsvIncome.toFixed(2));
console.log("CSV wydatki z dopasowaniem w DB:", matchedCsvExpense.toFixed(2));

console.log("\n=== TOTALY (logika Excel — kwota bazowa ze znakiem) ===");
console.log("CSV  przychody:", csvIncomeTotal.toFixed(2));
console.log("DB   przychody (bez needs_review):", dbIncomeTotal.toFixed(2));
console.log("Δ:", (dbIncomeTotal - csvIncomeTotal).toFixed(2));
console.log("");
console.log("CSV  wydatki:", csvExpenseTotal.toFixed(2));
console.log("DB   wydatki (bez needs_review):", dbExpenseTotal.toFixed(2));
console.log("Δ:", (dbExpenseTotal - csvExpenseTotal).toFixed(2));
console.log("");
console.log("DB needs_review przychody:", dbNeedsReviewIncome.toFixed(2));
console.log("DB needs_review wydatki:", dbNeedsReviewExpense.toFixed(2));

printCategoryDiff("PRZYCHODY", csvIncome, dbIncome);
printCategoryDiff("WYDATKI", csvExpense, dbExpense);

console.log("\n=== DOPASOWANE (inna treść Details / wielowierszowy CSV) ===");
console.log("Liczba:", detailsMismatch.length);

console.log("\n=== BRAKUJĄCE W BAZIE (są w CSV, brak w DB) ===");
console.log("Liczba:", missingInDb.length);
let missingIncome = 0;
let missingExpense = 0;
for (const r of missingInDb) {
  const a = excelTrackedAmount(r) ?? 0;
  if (r.tx_type === "income") missingIncome += a;
  if (r.tx_type === "expense") missingExpense += a;
}
console.log("Suma brakujących przychodów:", missingIncome.toFixed(2));
console.log("Suma brakujących wydatków:", missingExpense.toFixed(2));
for (const r of missingInDb.slice(0, 25)) {
  console.log(
    `  wiersz ${r.rowNumber} ${r.date} ${r.type} ${r.category} ${excelTrackedAmount(r)?.toFixed(2)} — ${r.details || "(brak opisu)"}`
  );
}
if (missingInDb.length > 25) console.log(`  ... i ${missingInDb.length - 25} więcej`);

console.log("\n=== DODATKOWE W BAZIE (nie ma w CSV 2023) ===");
console.log("Liczba:", extraInDb.length);
for (const tx of extraInDb.slice(0, 15)) {
  console.log(
    `  ${tx.date} ${tx.type} ${tx.categories?.name ?? "?"} ${dbExcelAmount(tx)?.toFixed(2)} — ${tx.details || ""}`
  );
}

const catDiffIncome = new Map();
const catDiffExpense = new Map();
for (const m of categoryMismatches) {
  const map = m.type?.toLowerCase() === "income" ? catDiffIncome : catDiffExpense;
  const key = `${m.csvCategory} → ${m.dbCategory}`;
  map.set(key, (map.get(key) ?? 0) + (m.amount ?? 0));
}
console.log("\n=== RÓŻNE KATEGORIE (ten sam wiersz, inna kategoria w DB) ===");
console.log("Liczba:", categoryMismatches.length);
const catSorted = [...catDiffIncome.entries(), ...catDiffExpense.entries()].sort(
  (a, b) => Math.abs(b[1]) - Math.abs(a[1])
);
for (const [k, v] of catSorted.slice(0, 15)) {
  console.log(`  ${k}: ${v.toFixed(2)} PLN`);
}

console.log("\n=== RÓŻNICE KWOT (ten sam hash, inna kwota) ===");
console.log("Liczba:", amountMismatches.length);
for (const m of amountMismatches.slice(0, 15)) {
  console.log(
    `  wiersz ${m.rowNumber} ${m.date} ${m.category} CSV ${m.csv} DB ${m.db} Δ ${m.diff} [${m.status}] ${m.details}`
  );
}

const outDir = join(ROOT, "data", "processed");
mkdirSync(outDir, { recursive: true });
const report = {
  csv_path: CSV_PATH,
  csv_rows: csvRows.length,
  totals: {
    csv_income: csvIncomeTotal,
    csv_expense: csvExpenseTotal,
    db_income: dbIncomeTotal,
    db_expense: dbExpenseTotal,
    db_needs_review_income: dbNeedsReviewIncome,
    db_needs_review_expense: dbNeedsReviewExpense,
  },
  missing_in_db: missingInDb.map((r) => ({
    rowNumber: r.rowNumber,
    date: r.date,
    type: r.type,
    category: r.category,
    amount: excelTrackedAmount(r),
    details: r.details,
    import_hash: r.import_hash,
  })),
  extra_in_db: extraInDb.map((tx) => ({
    id: tx.id,
    date: tx.date,
    type: tx.type,
    category: tx.categories?.name,
    amount: dbExcelAmount(tx),
    details: tx.details,
    import_hash: tx.import_hash,
  })),
  amount_mismatches: amountMismatches,
  category_income_diff: [...csvIncome.keys()]
    .concat([...dbIncome.keys()])
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((k) => ({
      category: k,
      csv: csvIncome.get(k) ?? 0,
      db: dbIncome.get(k) ?? 0,
      diff: (dbIncome.get(k) ?? 0) - (csvIncome.get(k) ?? 0),
    }))
    .filter((r) => Math.abs(r.diff) > 0.01)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
  category_expense_diff: [...csvExpense.keys()]
    .concat([...dbExpense.keys()])
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((k) => ({
      category: k,
      csv: csvExpense.get(k) ?? 0,
      db: dbExpense.get(k) ?? 0,
      diff: (dbExpense.get(k) ?? 0) - (csvExpense.get(k) ?? 0),
    }))
    .filter((r) => Math.abs(r.diff) > 0.01)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
};

const reportPath = join(outDir, "compare-2023-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf-8");
console.log(`\nRaport JSON: ${reportPath}`);
